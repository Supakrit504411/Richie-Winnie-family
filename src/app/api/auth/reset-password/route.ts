import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, authEmailForUserId } from '@/lib/supabase-server';

/** รีเซ็ตรหัสผ่านด้วยรหัสเชิญครอบครัว (กรณีลืมรหัส) */
export async function POST(request: NextRequest) {
  try {
    const { username, new_password, family_invite_code } = await request.json();
    const normalizedUsername = String(username || '').trim();
    const code = String(family_invite_code || '').trim().toUpperCase();

    if (!normalizedUsername || !new_password || !code) {
      return NextResponse.json({ error: 'กรอกชื่อผู้ใช้ รหัสใหม่ และรหัสเชิญครอบครัว' }, { status: 400 });
    }

    if (String(new_password).length < 4) {
      return NextResponse.json({ error: 'รหัสผ่านอย่างน้อย 4 ตัว' }, { status: 400 });
    }

    const { data: family, error: familyError } = await getSupabaseServer()
      .from('families')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle();

    if (familyError || !family) {
      return NextResponse.json({ error: 'รหัสเชิญไม่ถูกต้อง' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await getSupabaseServer()
      .from('users')
      .select('id, family_id')
      .eq('username', normalizedUsername)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    if (profile.family_id !== family.id) {
      return NextResponse.json({ error: 'ผู้ใช้ไม่อยู่ในครอบครัวนี้' }, { status: 403 });
    }

    const { error: updateError } = await getSupabaseServer().auth.admin.updateUserById(profile.id, {
      password: new_password,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const email = authEmailForUserId(profile.id);
    const { data: sessionData, error: sessionError } = await getSupabaseServer().auth.signInWithPassword({
      email,
      password: new_password,
    });

    if (sessionError || !sessionData.session) {
      return NextResponse.json({ success: true, message: 'เปลี่ยนรหัสแล้ว ลอง login ใหม่' });
    }

    const { data: fullProfile } = await getSupabaseServer()
      .from('users')
      .select('*')
      .eq('id', profile.id)
      .single();

    return NextResponse.json({
      success: true,
      session: sessionData.session,
      profile: fullProfile ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
