'use client';

import { useEffect } from 'react';

export default function Toast({
  message,
  duration = 3000,
}: {
  message: string;
  duration?: number;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      // Toast will be removed by CSS animation
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div className="toast">
      {message}
    </div>
  );
}
