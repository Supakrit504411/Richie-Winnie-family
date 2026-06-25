import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { getSupabaseServer } from '@/lib/supabase-server';

/** ดึงสมาชิกในครอบครัวผ่าน service role (หลีกเลี่ยง RLS recursion บน client) */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role'); // 'child' | 'parent' | null = all

    const { data: me, error: meError } = await getSupabaseServer()
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (meError || !me) {
      return NextResponse.json({ error: 'ไม่พบโปรไฟล์' }, { status: 404 });
    }

    let query = getSupabaseServer().from('users').select('*');

    if (me.family_id) {
      query = query.eq('family_id', me.family_id);
    } else if (me.role === 'parent') {
      query = query.eq('parent_id', me.id);
    } else if (me.parent_id) {
      query = query.or(`parent_id.eq.${me.parent_id},id.eq.${me.parent_id}`);
    } else {
      return NextResponse.json({ members: [me], me });
    }

    if (roleFilter === 'child') {
      query = query.eq('role', 'child');
    } else if (roleFilter === 'parent') {
      query = query.eq('role', 'parent');
    }

    const { data: members, error } = await query.order('username');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ members: members ?? [], me });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
