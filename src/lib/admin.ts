import { getSupabaseServer } from '@/lib/supabase-server';

/** Comma-separated user UUIDs in APP_ADMIN_USER_IDS */
export function isAppAdmin(userId: string): boolean {
  const ids = process.env.APP_ADMIN_USER_IDS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  if (ids.includes(userId)) return true;

  return false;
}

export async function isAppAdminByUsername(username: string): Promise<boolean> {
  const names =
    process.env.APP_ADMIN_USERNAMES?.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) ??
    [];
  if (names.length === 0) return false;
  return names.includes(username.trim().toLowerCase());
}

export async function assertAppAdmin(userId: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (isAppAdmin(userId)) return { ok: true };

  const server = getSupabaseServer();
  const { data: profile } = await server
    .from('users')
    .select('username')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.username && (await isAppAdminByUsername(profile.username))) {
    return { ok: true };
  }

  return { ok: false, status: 403, error: 'เฉพาะผู้ดูแลระบบเท่านั้น' };
}

export async function assertUserCanAccessApp(userId: string): Promise<
  | { ok: true; username: string }
  | { ok: false; status: number; error: string }
> {
  const server = getSupabaseServer();
  const { data: profile, error } = await server
    .from('users')
    .select('id, username, is_active, family_id')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { ok: false, status: 404, error: 'ไม่พบผู้ใช้' };
  }

  if (profile.is_active === false) {
    return {
      ok: false,
      status: 403,
      error: 'บัญชีนี้ถูกปิดใช้งาน — ติดต่อผู้ดูแลแอป',
    };
  }

  if (profile.family_id) {
    const { data: family } = await server
      .from('families')
      .select('is_active')
      .eq('id', profile.family_id)
      .maybeSingle();

    if (family?.is_active === false) {
      return {
        ok: false,
        status: 403,
        error: 'ครอบครัวนี้ถูกปิดใช้งาน — ติดต่อผู้ดูแลแอป',
      };
    }
  }

  return { ok: true, username: profile.username };
}
