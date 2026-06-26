'use client';

import { useState, useRef, useEffect } from 'react';
import { showAlert } from '@/components/SweetAlert';

interface EvidenceUploaderProps {
  onUpload: (urls: string[]) => void;
  existingUrls?: string[];
  userId?: string;
}

export default function EvidenceUploader({
  onUpload,
  existingUrls = [],
  userId = 'evidence',
}: EvidenceUploaderProps) {
  const [urls, setUrls] = useState<string[]>(existingUrls);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrls(existingUrls);
  }, [existingUrls]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUrls((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }

  async function handleUpload() {
    if (urls.length === 0) return;

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const url of urls) {
        if (url.startsWith('http') && url.includes('supabase')) {
          uploadedUrls.push(url);
          continue;
        }

        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], `image_${Date.now()}.jpg`, { type: 'image/jpeg' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.url) {
          uploadedUrls.push(uploadData.url);
        }
      }

      if (uploadedUrls.length === 0) {
        showAlert({ title: 'อัปโหลดไม่สำเร็จ', text: 'กรุณาลองใหม่', icon: 'error' });
        return;
      }

      setUrls(uploadedUrls);
      onUpload(uploadedUrls);
      showAlert({
        title: 'อัปโหลดสำเร็จ',
        text: `แนบภาพ ${uploadedUrls.length} รูปแล้ว`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Upload error:', error);
      showAlert({ title: 'อัปโหลดไม่สำเร็จ', text: 'กรุณาลองใหม่', icon: 'error' });
    } finally {
      setUploading(false);
    }
  }

  function removeUrl(index: number) {
    const next = urls.filter((_, i) => i !== index);
    setUrls(next);
    onUpload(next);
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
                type="button"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                onClick={() => removeUrl(idx)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {urls.some((url) => url.startsWith('data:')) && (
        <button
          type="button"
          className="btn btn-primary btn-sm mt-3"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? 'กำลังอัปโหลด...' : `อัปโหลด ${urls.filter((u) => u.startsWith('data:')).length} ภาพ`}
        </button>
      )}
    </div>
  );
}
