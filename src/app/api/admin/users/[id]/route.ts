import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getAuthUserId } from '@/lib/api-auth';
import { assertAppAdmin } from '@/lib/admin';

/** เปิด/ปิด user รายคน */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await getAuthUserId(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await assertAppAdmin(adminId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { id } = await params;
    const { is_active } = await request.json();

    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active ต้องเป็น true/false' }, { status: 400 });
    }

    if (id === adminId && !is_active) {
      return NextResponse.json({ error: 'ไม่สามารถปิดบัญชี admin ของตัวเองได้' }, { status: 400 });
    }

    const server = getSupabaseServer();
    const { data, error } = await server
      .from('users')
      .update({ is_active })
      .eq('id', id)
      .select('id, username, role, is_active, family_id')
      .single();

    if (error) throw error;

    return NextResponse.json({ user: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
