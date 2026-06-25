import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    let query = getSupabaseServer()
      .from('redemptions')
      .select('*, shop_items(name, icon)')
      .order('created_at', { ascending: false });

    if (childId) {
      query = query.eq('child_id', childId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ redemptions: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { child_id, item_id } = await request.json();

    if (!child_id || !item_id) {
      return NextResponse.json({ error: 'child_id and item_id are required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer().from('redemptions').insert({
      child_id,
      item_id,
      status: 'pending',
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ redemption: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
