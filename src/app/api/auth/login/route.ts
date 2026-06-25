import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, authEmailForUserId } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'กรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await getSupabaseServer()
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 401 });
    }

    const email = authEmailForUserId(profile.id);
    const { data, error } = await getSupabaseServer().auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      userId: profile.id,
      session: data.session,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
