import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getAuthUserId } from '@/lib/api-auth';

async function assertParentCanManageChild(parentId: string, childId: string) {
  const server = getSupabaseServer();

  const { data: parent } = await server
    .from('users')
    .select('id, role, family_id')
    .eq('id', parentId)
    .single();

  if (!parent || parent.role !== 'parent') {
    return { ok: false as const, status: 403, error: 'เฉพาะผู้ปกครองเท่านั้น' };
  }

  const { data: child } = await server
    .from('users')
    .select('id, role, family_id, parent_id, coins, xp')
    .eq('id', childId)
    .single();

  if (!child || child.role !== 'child') {
    return { ok: false as const, status: 404, error: 'ไม่พบบัญชีเด็ก' };
  }

  const sameFamily =
    parent.family_id &&
    child.family_id &&
    parent.family_id === child.family_id;
  const legacyParent = child.parent_id === parent.id;

  if (!sameFamily && !legacyParent) {
    return { ok: false as const, status: 403, error: 'ไม่มีสิทธิ์จัดการเด็กคนนี้' };
  }

  return { ok: true as const, child };
}

// PATCH: Approve or reject submission (server-side rewards)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parentId = await getAuthUserId(request);
    if (!parentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action as 'approve' | 'reject';
    const penalty = Number(body.penalty) || 0;
    const rejectReason = body.reject_reason ? String(body.reject_reason) : '';

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const server = getSupabaseServer();

    const { data: submission, error: subError } = await server
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ error: 'ไม่พบรายการส่งภารกิจ' }, { status: 404 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'รายการนี้ตรวจแล้ว' }, { status: 400 });
    }

    const access = await assertParentCanManageChild(parentId, submission.child_id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const childUser = access.child;

    if (action === 'approve') {
      const { data: mission, error: missionError } = await server
        .from('missions')
        .select('*')
        .eq('id', submission.mission_id)
        .single();

      if (missionError || !mission) {
        return NextResponse.json({ error: 'ไม่พบภารกิจ' }, { status: 404 });
      }

      const { error: updateSubError } = await server
        .from('submissions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: parentId,
        })
        .eq('id', id);

      if (updateSubError) throw updateSubError;

      const { error: updateUserError } = await server
        .from('users')
        .update({
          coins: childUser.coins + mission.coin_reward,
          xp: childUser.xp + mission.xp_reward,
        })
        .eq('id', submission.child_id);

      if (updateUserError) throw updateUserError;

      const { error: historyError } = await server.from('coin_history').insert({
        child_id: submission.child_id,
        delta: mission.coin_reward,
        reason: `ภารกิจสำเร็จ: ${mission.title}`,
        kind: 'mission',
      });

      if (historyError) throw historyError;

      return NextResponse.json({
        success: true,
        coins_awarded: mission.coin_reward,
        xp_awarded: mission.xp_reward,
      });
    }

    const { error: rejectError } = await server
      .from('submissions')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: parentId,
        note: rejectReason || submission.note,
      })
      .eq('id', id);

    if (rejectError) throw rejectError;

    if (penalty > 0) {
      const newCoins = Math.max(0, childUser.coins - penalty);

      const { error: updateUserError } = await server
        .from('users')
        .update({ coins: newCoins })
        .eq('id', submission.child_id);

      if (updateUserError) throw updateUserError;

      const { error: historyError } = await server.from('coin_history').insert({
        child_id: submission.child_id,
        delta: -penalty,
        reason: rejectReason || 'ไม่ผ่าน',
        kind: 'penalty',
      });

      if (historyError) throw historyError;
    }

    return NextResponse.json({ success: true, penalty_applied: penalty });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
