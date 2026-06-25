import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serverClient: SupabaseClient | null = null;

export function getSupabaseServer() {
  if (serverClient) return serverClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  serverClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return serverClient;
}

export function authEmailForUserId(userId: string) {
  return `${userId}@family-quest.local`;
}
