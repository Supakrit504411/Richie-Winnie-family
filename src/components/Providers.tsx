'use client';

import { AuthProvider } from '@/lib/auth';
import { SweetAlertProvider } from '@/components/SweetAlert';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SweetAlertProvider>{children}</SweetAlertProvider>
    </AuthProvider>
  );
}
