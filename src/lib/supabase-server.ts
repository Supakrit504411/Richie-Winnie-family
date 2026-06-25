import { createClient } from '@supabase/supabase-js';

/** Service-role client — สร้างใหม่ทุกครั้ง เพื่อไม่ให้ signInWithPassword ปน session แล้วโดน RLS */
export function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function authEmailForUserId(userId: string) {
  return `${userId}@family-quest.local`;
}
