import { getSupabaseServer } from '@/lib/supabase-server';

export async function assertParentCanManageChild(parentId: string, childId: string) {
  const server = getSupabaseServer();

  const { data: parent } = await server
    .from('users')
    .select('id, role, family_id')
    .eq('id', parentId)
    .single();

  if (!parent || parent.role !== 'parent') {
    return { ok: false as const, status: 403, error: 'เฉพาะผู้ปกครองเท่านั้น' };
  }

  const { data: child } = await server
    .from('users')
    .select('id, role, family_id, parent_id, coins, xp')
    .eq('id', childId)
    .single();

  if (!child || child.role !== 'child') {
    return { ok: false as const, status: 404, error: 'ไม่พบบัญชีเด็ก' };
  }

  const sameFamily =
    parent.family_id &&
    child.family_id &&
    parent.family_id === child.family_id;
  const legacyParent = child.parent_id === parent.id;

  if (!sameFamily && !legacyParent) {
    return { ok: false as const, status: 403, error: 'ไม่มีสิทธิ์จัดการเด็กคนนี้' };
  }

  return { ok: true as const, child };
}
