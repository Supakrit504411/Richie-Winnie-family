'use client';

import { useRef, useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api-client';
import { showAlert } from '@/components/SweetAlert';
import StorageImage from '@/components/StorageImage';

interface ProfileAvatarEditorProps {
  userId: string;
  emoji?: string;
  avatarUrl?: string | null;
  onUpdated?: (avatarUrl: string) => void;
  size?: 'sm' | 'md';
}

export default function ProfileAvatarEditor({
  userId,
  emoji = '🐯',
  avatarUrl,
  onUpdated,
  size = 'md',
}: ProfileAvatarEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(avatarUrl || '');
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    setPreview(avatarUrl || '');
  }, [avatarUrl]);

  const dimension = size === 'sm' ? 64 : 96;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) setLocalPreview(event.target.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    showAlert({ title: 'กำลังอัปโหลดรูป...', icon: 'loading', showConfirmButton: false });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'อัปโหลดไม่สำเร็จ');
      }

      const profileRes = await fetchWithAuth('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, avatar_url: uploadData.url }),
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok) {
        throw new Error(profileData.error || 'บันทึกโปรไฟล์ไม่สำเร็จ');
      }

      setPreview(uploadData.url);
      setLocalPreview(null);
      onUpdated?.(uploadData.url);
      showAlert({
        title: 'อัปเดตรูปโปรไฟล์แล้ว',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      showAlert({
        title: 'อัปโหลดไม่สำเร็จ',
        text: err instanceof Error ? err.message : 'กรุณาลองใหม่',
        icon: 'error',
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        className="relative rounded-full overflow-hidden border-2 flex items-center justify-center"
        style={{
          width: dimension,
          height: dimension,
          borderColor: 'var(--line)',
          background: 'var(--cream)',
        }}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {localPreview ? (
          <img src={localPreview} alt="Profile" className="w-full h-full object-cover" />
        ) : preview ? (
          <StorageImage
            src={preview}
            alt="Profile"
            className="w-full h-full object-cover"
            fallback={<span style={{ fontSize: size === 'sm' ? 32 : 48 }}>{emoji}</span>}
          />
        ) : (
          <span style={{ fontSize: size === 'sm' ? 32 : 48 }}>{emoji}</span>
        )}
      </button>
      <div>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'กำลังอัปโหลด...' : '📷 เปลี่ยนรูปโปรไฟล์'}
        </button>
        <p className="muted text-sm mt-1">แตะรูปหรือปุ่มเพื่อเลือกภาพ</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
