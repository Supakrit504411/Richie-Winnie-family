import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, authEmailForUserId } from '@/lib/supabase-server';
import { assertUserCanAccessApp } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const normalizedUsername = String(username).trim();

    if (!normalizedUsername || !password) {
      return NextResponse.json({ error: 'กรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await getSupabaseServer()
      .from('users')
      .select('id')
      .eq('username', normalizedUsername)
      .maybeSingle();

    if (profileError) {
      const isRlsRecursion = profileError.message.includes('infinite recursion');
      return NextResponse.json({
        error: isRlsRecursion
          ? 'ระบบฐานข้อมูลยังตั้งค่าไม่ครบ — เปิด Supabase → SQL Editor แล้วรันไฟล์ supabase-fix-rls-recursion.sql'
          : profileError.message,
      }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({
        error: 'ไม่พบผู้ใช้ — ตรวจสอบชื่อให้ถูกต้อง หรือสมัครใหม่',
      }, { status: 401 });
    }

    const email = authEmailForUserId(profile.id);
    const { data, error } = await getSupabaseServer().auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const { data: fullProfile, error: fullProfileError } = await getSupabaseServer()
      .from('users')
      .select('*')
      .eq('id', profile.id)
      .single();

    if (fullProfileError || !fullProfile) {
      return NextResponse.json({
        error: fullProfileError?.message || 'ไม่พบโปรไฟล์ในฐานข้อมูล — ลองสมัครใหม่',
      }, { status: 500 });
    }

    const access = await assertUserCanAccessApp(profile.id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    return NextResponse.json({
      success: true,
      userId: profile.id,
      session: data.session,
      profile: fullProfile,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
