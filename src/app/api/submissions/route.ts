import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

// GET: List submissions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const status = searchParams.get('status');

    let query = getSupabaseServer()
      .from('submissions')
      .select('*, missions(title, icon, coin_reward, xp_reward), users(username, avatar)')
      .order('created_at', { ascending: false });

    if (childId) {
      query = query.eq('child_id', childId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ submissions: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create submission
export async function POST(request: NextRequest) {
  try {
    const { child_id, mission_id, submission_date, evidence_urls, note } = await request.json();

    if (!child_id || !mission_id || !submission_date) {
      return NextResponse.json(
        { error: 'child_id, mission_id, and submission_date are required' },
        { status: 400 }
      );
    }

    // Check if already submitted today
    const { data: existing } = await getSupabaseServer()
      .from('submissions')
      .select('id')
      .eq('child_id', child_id)
      .eq('mission_id', mission_id)
      .eq('submission_date', submission_date)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already submitted today' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer().from('submissions').insert({
      child_id,
      mission_id,
      submission_date,
      status: 'pending',
      evidence_urls: evidence_urls || [],
      note: note || null,
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ submission: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
