import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { assertParentCanManageChild } from '@/lib/parent-access';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const parentId = await getAuthUserId(request);
    if (!parentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const childId = String(body.child_id || '');
    const reason = String(body.reason || '').trim();
    const amount = Math.max(0, Math.floor(Number(body.amount) || 0));

    if (!childId) {
      return NextResponse.json({ error: 'กรุณาเลือกลูก' }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: 'กรุณาใส่ข้อความตักเตือน' }, { status: 400 });
    }

    const access = await assertParentCanManageChild(parentId, childId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const server = getSupabaseServer();
    const childUser = access.child;

    if (amount > 0) {
      const newCoins = Math.max(0, childUser.coins - amount);
      const { error: updateError } = await server
        .from('users')
        .update({ coins: newCoins })
        .eq('id', childId);

      if (updateError) throw updateError;
    }

    const historyReason = amount > 0
      ? `ตักเตือนและหักเหรียญ: ${reason}`
      : `ตักเตือน: ${reason}`;

    const { error: historyError } = await server.from('coin_history').insert({
      child_id: childId,
      delta: amount > 0 ? -amount : 0,
      reason: historyReason,
      kind: 'penalty',
    });

    if (historyError) throw historyError;

    return NextResponse.json({
      success: true,
      penalty_applied: amount,
      new_coins: amount > 0 ? Math.max(0, childUser.coins - amount) : childUser.coins,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
