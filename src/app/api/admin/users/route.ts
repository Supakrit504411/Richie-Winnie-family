import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getAuthUserId } from '@/lib/api-auth';
import { assertAppAdmin } from '@/lib/admin';

/** รายชื่อครอบครัวและสมาชิกทั้งหมด (admin เท่านั้น) */
export async function GET(request: NextRequest) {
  try {
    const adminId = await getAuthUserId(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await assertAppAdmin(adminId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const server = getSupabaseServer();

    const [{ data: families }, { data: users }] = await Promise.all([
      server.from('families').select('id, name, invite_code, created_at, is_active').order('created_at', { ascending: false }),
      server
        .from('users')
        .select('id, username, role, avatar, created_at, family_id, is_active')
        .order('created_at', { ascending: false }),
    ]);

    const membersByFamily = new Map<string, typeof users>();
    const orphans: NonNullable<typeof users> = [];

    for (const user of users ?? []) {
      if (user.family_id) {
        const list = membersByFamily.get(user.family_id) ?? [];
        list.push(user);
        membersByFamily.set(user.family_id, list);
      } else {
        orphans.push(user);
      }
    }

    const grouped = (families ?? []).map((family) => ({
      ...family,
      members: membersByFamily.get(family.id) ?? [],
    }));

    return NextResponse.json({ families: grouped, orphanUsers: orphans });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
