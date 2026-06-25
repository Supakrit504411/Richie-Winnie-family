import { supabase } from '@/lib/supabase';

export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  return fetch(url, { ...init, headers });
}
