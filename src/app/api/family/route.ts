import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const { data: user, error: userError } = await getSupabaseServer()
      .from('users')
      .select('id, role, family_id')
      .eq('id', userId)
      .single();

    if (userError || !user?.family_id) {
      return NextResponse.json({ error: 'ไม่พบครอบครัว' }, { status: 404 });
    }

    const { data: family, error: familyError } = await getSupabaseServer()
      .from('families')
      .select('*')
      .eq('id', user.family_id)
      .single();

    if (familyError || !family) {
      return NextResponse.json({ error: 'ไม่พบครอบครัว' }, { status: 404 });
    }

    const { data: members } = await getSupabaseServer()
      .from('users')
      .select('id, username, role, avatar')
      .eq('family_id', user.family_id);

    return NextResponse.json({ family, members: members ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
