import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { data, error } = await getSupabaseServer()
      .from('users')
      .select('id, username, avatar')
      .eq('role', 'parent')
      .order('username');

    if (error) throw error;
    return NextResponse.json({ parents: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
