import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const childId = await getAuthUserId(request);
    if (!childId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { item_id } = await request.json();

    if (!item_id) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
    }

    const server = getSupabaseServer();

    const { data: childUser, error: childError } = await server
      .from('users')
      .select('id, role, coins')
      .eq('id', childId)
      .single();

    if (childError || !childUser || childUser.role !== 'child') {
      return NextResponse.json({ error: 'ไม่พบบัญชีเด็ก' }, { status: 403 });
    }

    const { data: item, error: itemError } = await server
      .from('shop_items')
      .select('*')
      .eq('id', item_id)
      .eq('active', true)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'ไม่พบของรางวัล' }, { status: 404 });
    }

    const price = item.price ?? 0;
    if (childUser.coins < price) {
      const shortage = price - childUser.coins;
      return NextResponse.json(
        {
          error: 'เหรียญไม่พอ',
          coins: childUser.coins,
          price,
          shortage,
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await server
      .from('users')
      .update({ coins: childUser.coins - price })
      .eq('id', childId);

    if (updateError) throw updateError;

    const { data: redemption, error: redemptionError } = await server
      .from('redemptions')
      .insert({
        child_id: childId,
        item_id,
        status: 'pending',
      })
      .select()
      .single();

    if (redemptionError) throw redemptionError;

    const { error: historyError } = await server.from('coin_history').insert({
      child_id: childId,
      delta: -price,
      reason: `แลกของรางวัล: ${item.name}`,
      kind: 'redeem',
    });

    if (historyError) throw historyError;

    return NextResponse.json({
      redemption,
      new_coins: childUser.coins - price,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
