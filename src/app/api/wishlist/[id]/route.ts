import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action, approved_price, approved_by } = await request.json();

    if (!action || !approved_by) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }

    const { data: wish, error: wishError } = await getSupabaseServer()
      .from('wishlist_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (wishError || !wish) {
      return NextResponse.json({ error: 'ไม่พบคำขอ' }, { status: 404 });
    }

    if (wish.status !== 'pending') {
      return NextResponse.json({ error: 'คำขอนี้ดำเนินการแล้ว' }, { status: 400 });
    }

    if (action === 'reject') {
      const { data, error } = await getSupabaseServer()
        .from('wishlist_requests')
        .update({
          status: 'rejected',
          approved_by,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ request: data });
    }

    if (action === 'approve') {
      const price = Number(approved_price);
      if (!price || price < 1) {
        return NextResponse.json({ error: 'กรุณาตั้งราคาเหรียญอย่างน้อย 1' }, { status: 400 });
      }

      const { data: shopItem, error: shopError } = await getSupabaseServer()
        .from('shop_items')
        .insert({
          name: wish.item_name,
          icon: wish.icon || '🎁',
          price,
          created_by: approved_by,
          active: true,
        })
        .select()
        .single();

      if (shopError) throw shopError;

      const { data, error } = await getSupabaseServer()
        .from('wishlist_requests')
        .update({
          status: 'approved',
          approved_price: price,
          approved_by,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ request: data, shop_item: shopItem });
    }

    return NextResponse.json({ error: 'action ไม่ถูกต้อง' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
