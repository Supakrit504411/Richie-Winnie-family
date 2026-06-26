import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getAuthUserId } from '@/lib/api-auth';

/** ผู้ปกครองเปลี่ยนรหัสผ่านให้ลูกในครอบครัวเดียวกัน */
export async function POST(request: NextRequest) {
  try {
    const parentId = await getAuthUserId(request);
    if (!parentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { child_id, new_password } = await request.json();

    if (!child_id || !new_password) {
      return NextResponse.json({ error: 'กรอกข้อมูลให้ครบ' }, { status: 400 });
    }

    if (String(new_password).length < 4) {
      return NextResponse.json({ error: 'รหัสผ่านอย่างน้อย 4 ตัว' }, { status: 400 });
    }

    const server = getSupabaseServer();

    const { data: parent } = await server
      .from('users')
      .select('id, role, family_id')
      .eq('id', parentId)
      .single();

    if (!parent || parent.role !== 'parent') {
      return NextResponse.json({ error: 'เฉพาะผู้ปกครองเท่านั้น' }, { status: 403 });
    }

    const { data: child } = await server
      .from('users')
      .select('id, role, family_id, parent_id')
      .eq('id', child_id)
      .single();

    if (!child || child.role !== 'child') {
      return NextResponse.json({ error: 'ไม่พบบัญชีเด็ก' }, { status: 404 });
    }

    const sameFamily =
      parent.family_id &&
      child.family_id &&
      parent.family_id === child.family_id;
    const legacyParent = child.parent_id === parent.id;

    if (!sameFamily && !legacyParent) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เปลี่ยนรหัสเด็กคนนี้' }, { status: 403 });
    }

    const { error: updateError } = await server.auth.admin.updateUserById(child.id, {
      password: new_password,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `เปลี่ยนรหัสให้ ${child.id} แล้ว`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
