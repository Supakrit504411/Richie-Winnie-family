import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

// GET: List missions
export async function GET() {
  try {
    const { data, error } = await getSupabaseServer()
      .from('missions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ missions: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create mission
export async function POST(request: NextRequest) {
  try {
    const { title, icon, type, deadline, start_date, end_date, recurring_days, attachments, coin_reward, xp_reward } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer().from('missions').insert({
      title,
      icon: icon || '📋',
      type: type || 'daily',
      deadline: deadline || null,
      start_date: start_date || null,
      end_date: end_date || null,
      recurring_days: recurring_days || null,
      attachments: attachments || null,
      coin_reward: coin_reward || 10,
      xp_reward: xp_reward || 10,
      created_by: 'parent-id-here', // Will be set from auth in real implementation
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ mission: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
