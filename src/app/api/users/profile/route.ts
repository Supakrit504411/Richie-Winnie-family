import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getAuthUserId } from '@/lib/api-auth';

/** อัปเดตโปรไฟล์ (avatar / avatar_url) */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const targetUserId = body.user_id ? String(body.user_id) : userId;
    const avatar = body.avatar !== undefined ? String(body.avatar) : undefined;
    const avatarUrl = body.avatar_url !== undefined ? String(body.avatar_url) : undefined;

    const server = getSupabaseServer();

    if (targetUserId !== userId) {
      const { data: parent } = await server
        .from('users')
        .select('id, role, family_id')
        .eq('id', userId)
        .single();

      if (!parent || parent.role !== 'parent') {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
      }

      const { data: child } = await server
        .from('users')
        .select('id, role, family_id, parent_id')
        .eq('id', targetUserId)
        .single();

      if (!child) {
        return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
      }

      const sameFamily =
        parent.family_id &&
        child.family_id &&
        parent.family_id === child.family_id;
      const legacyParent = child.parent_id === parent.id;

      if (!sameFamily && !legacyParent) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขโปรไฟล์นี้' }, { status: 403 });
      }
    }

    const updates: Record<string, string> = {};
    if (avatar !== undefined) updates.avatar = avatar;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลที่จะอัปเดต' }, { status: 400 });
    }

    const { data, error } = await server
      .from('users')
      .update(updates)
      .eq('id', targetUserId)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ profile: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
