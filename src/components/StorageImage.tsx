'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api-client';
import { isSupabaseStorageUrl } from '@/lib/storage-url';

interface StorageImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}

export default function StorageImage({
  src,
  alt,
  className,
  style,
  fallback = null,
}: StorageImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setDisplaySrc(null);
      return;
    }

    if (src.startsWith('data:') || src.startsWith('blob:') || !isSupabaseStorageUrl(src)) {
      setDisplaySrc(src);
      return;
    }

    let cancelled = false;

    fetchWithAuth(`/api/media/signed-url?url=${encodeURIComponent(src)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setDisplaySrc(data.url || null);
      })
      .catch(() => {
        if (!cancelled) setDisplaySrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!displaySrc) return <>{fallback}</>;

  return <img src={displaySrc} alt={alt} className={className} style={style} />;
}
