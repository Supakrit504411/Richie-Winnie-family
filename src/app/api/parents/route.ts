import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { isRegistrationOpen } from '@/lib/registration';

export async function GET() {
  if (!isRegistrationOpen()) {
    return NextResponse.json({ parents: [] });
  }

  try {
    const { data, error } = await getSupabaseServer()
      .from('users')
      .select('id, username, avatar')
      .eq('role', 'parent')
      .order('username');

    if (error) throw error;
    return NextResponse.json({ parents: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : (error as { message?: string })?.message || 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
