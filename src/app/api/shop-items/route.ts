import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { data, error } = await getSupabaseServer()
      .from('shop_items')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ items: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, icon, price } = await request.json();

    if (!name || !price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer().from('shop_items').insert({
      name,
      icon: icon || '🎁',
      price,
      created_by: 'parent-id-here',
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
