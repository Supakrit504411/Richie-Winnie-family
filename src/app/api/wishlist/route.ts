import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const familyId = searchParams.get('family_id');
    const parentId = searchParams.get('parent_id');

    let query = getSupabaseServer()
      .from('wishlist_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (childId) {
      query = query.eq('child_id', childId);
    } else if (familyId) {
      const { data: children } = await getSupabaseServer()
        .from('users')
        .select('id')
        .eq('family_id', familyId)
        .eq('role', 'child');

      const childIds = (children ?? []).map(c => c.id);
      if (childIds.length === 0) {
        return NextResponse.json({ requests: [] });
      }
      query = query.in('child_id', childIds);
    } else if (parentId) {
      const { data: parent } = await getSupabaseServer()
        .from('users')
        .select('family_id')
        .eq('id', parentId)
        .single();

      if (!parent?.family_id) {
        return NextResponse.json({ requests: [] });
      }

      const { data: children } = await getSupabaseServer()
        .from('users')
        .select('id')
        .eq('family_id', parent.family_id)
        .eq('role', 'child');

      const childIds = (children ?? []).map(c => c.id);
      if (childIds.length === 0) {
        return NextResponse.json({ requests: [] });
      }
      query = query.in('child_id', childIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ requests: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { child_id, item_name, icon, suggested_price } = await request.json();

    if (!child_id || !item_name) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อของรางวัล' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer().from('wishlist_requests').insert({
      child_id,
      requested_by: child_id,
      item_name: String(item_name).trim(),
      icon: icon || '🎁',
      suggested_price: suggested_price ? Number(suggested_price) : null,
      status: 'pending',
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ request: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
