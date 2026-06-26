'use client';

import { useState, useRef } from 'react';

interface EvidenceUploaderProps {
  onUpload: (urls: string[]) => void;
  existingUrls?: string[];
}

export default function EvidenceUploader({ onUpload, existingUrls = [] }: EvidenceUploaderProps) {
  const [urls, setUrls] = useState<string[]>(existingUrls);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newUrls: string[] = [];

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newUrls.push(event.target.result as string);
          
          if (newUrls.length === files.length) {
            setUrls(prev => [...prev, ...newUrls]);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  }

  async function handleUpload() {
    if (urls.length === 0) return;

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const url of urls) {
        // Skip if already a public URL (from existing or previous upload)
        if (url.startsWith('http') && url.includes('supabase')) {
          uploadedUrls.push(url);
          continue;
        }

        // Convert base64 to blob
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Create File object
        const file = new File([blob], `image_${Date.now()}.jpg`, { type: 'image/jpeg' });

        // Upload to API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', 'evidence');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.url) {
          uploadedUrls.push(uploadData.url);
        }
      }

      onUpload(uploadedUrls);
      setUrls([]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('อัปโหลดไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setUploading(false);
    }
  }

  function removeUrl(index: number) {
    setUrls(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div
        className="upload-area"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="text-3xl mb-2">📸</div>
        <p className="font-bold">ถ่ายรูป / เลือกภาพ</p>
        <p className="muted text-sm">แนบหลักฐานการทำภารกิจ (ไม่จำเป็น)</p>
      </div>

      {urls.length > 0 && (
        <div className="evidence-grid mt-3">
          {urls.map((url, idx) => (
            <div key={idx} className="relative">
              <img src={url} alt={`Evidence ${idx + 1}`} className="evidence-thumb" />
              <button
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                onClick={() => removeUrl(idx)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {urls.length > 0 && (
        <button
          className="btn btn-primary btn-sm mt-3"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? 'กำลังอัปโหลด...' : `อัปโหลด ${urls.length} ภาพ`}
        </button>
      )}
    </div>
  );
}
