import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, authEmailForUserId } from '@/lib/supabase-server';
import { generateInviteCode } from '@/lib/family';

function dbMessage(error: { message?: string; code?: string } | null | undefined) {
  return error?.message || error?.code || 'unknown error';
}

async function createFamilyForParent(username: string): Promise<{ id: string } | { error: string }> {
  let lastError = 'unknown';
  let inviteCode = generateInviteCode();

  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await getSupabaseServer()
      .from('families')
      .insert({
        name: `${username} ครอบครัว`,
        invite_code: inviteCode,
      })
      .select('id')
      .single();

    if (!error && data) return { id: data.id };

    lastError = dbMessage(error);
    if (lastError.includes('does not exist') || lastError.includes('Could not find the table')) {
      return {
        error: 'ยังไม่มีตาราง families — เปิด Supabase → SQL Editor → รันไฟล์ supabase-migration-v2-families.sql',
      };
    }
    inviteCode = generateInviteCode();
  }

  return { error: lastError };
}

export async function POST(request: NextRequest) {
  try {
    const {
      username,
      password,
      role,
      avatar,
      parent_id,
      parent_mode,
      family_invite_code,
    } = await request.json();

    const normalizedUsername = String(username).trim();
    const mode = parent_mode === 'join' ? 'join' : 'create';

    if (!normalizedUsername || !password || !role) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }

    if (role === 'child' && !parent_id) {
      return NextResponse.json({ error: 'กรุณาเลือกผู้ปกครอง' }, { status: 400 });
    }

    if (role === 'parent' && mode === 'join' && !family_invite_code) {
      return NextResponse.json({ error: 'กรุณาใส่รหัสเชิญครอบครัว' }, { status: 400 });
    }

    const { data: existing } = await getSupabaseServer()
      .from('users')
      .select('id')
      .eq('username', normalizedUsername)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้นี้มีแล้ว' }, { status: 400 });
    }

    let familyId: string | null = null;

    if (role === 'parent') {
      if (mode === 'join') {
        const code = String(family_invite_code).trim().toUpperCase();
        const { data: family, error: familyError } = await getSupabaseServer()
          .from('families')
          .select('id')
          .eq('invite_code', code)
          .maybeSingle();

        if (familyError) {
          const msg = dbMessage(familyError);
          if (msg.includes('does not exist') || msg.includes('Could not find the table')) {
            return NextResponse.json({
              error: 'ยังไม่มีตาราง families — รัน supabase-migration-v2-families.sql ใน Supabase SQL Editor',
            }, { status: 500 });
          }
          return NextResponse.json({ error: msg }, { status: 500 });
        }

        if (!family) {
          return NextResponse.json({ error: 'รหัสเชิญไม่ถูกต้อง' }, { status: 400 });
        }
        familyId = family.id;
      } else {
        const familyResult = await createFamilyForParent(normalizedUsername);
        if ('error' in familyResult) {
          return NextResponse.json({ error: familyResult.error }, { status: 500 });
        }
        familyId = familyResult.id;
      }
    } else if (role === 'child') {
      const { data: parentUser, error: parentError } = await getSupabaseServer()
        .from('users')
        .select('id, family_id')
        .eq('id', parent_id)
        .eq('role', 'parent')
        .maybeSingle();

      if (parentError || !parentUser) {
        return NextResponse.json({ error: 'ไม่พบผู้ปกครอง' }, { status: 400 });
      }
      familyId = parentUser.family_id;
    }

    const tempEmail = `temp-${crypto.randomUUID()}@family-quest.local`;
    const { data: authData, error: authError } = await getSupabaseServer().auth.admin.createUser({
      email: tempEmail,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      const msg = authError?.message || 'สร้างบัญชีไม่สำเร็จ';
      if (msg.toLowerCase().includes('invalid api key')) {
        return NextResponse.json({
          error: 'Service Role Key ไม่ถูกต้อง — เปิด /api/setup-check เพื่อตรวจสอบ',
        }, { status: 500 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const userId = authData.user.id;
    const finalEmail = authEmailForUserId(userId);

    await getSupabaseServer().auth.admin.updateUserById(userId, { email: finalEmail });

    const { error: profileError } = await getSupabaseServer().from('users').insert({
      id: userId,
      username: normalizedUsername,
      role,
      avatar: avatar || (role === 'parent' ? '👨' : '🐯'),
      parent_id: role === 'child' ? parent_id : null,
      family_id: familyId,
      password_hash: '',
      coins: 0,
      xp: 0,
      house_level: 1,
      car_level: 1,
      streak: 0,
    });

    if (profileError) {
      await getSupabaseServer().auth.admin.deleteUser(userId);
      const msg = dbMessage(profileError);
      if (msg.includes('family_id') && (msg.includes('does not exist') || msg.includes('column'))) {
        return NextResponse.json({
          error: 'ยังไม่มีคอลัมน์ family_id — รัน supabase-migration-v2-families.sql ใน Supabase SQL Editor',
        }, { status: 500 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data: sessionData, error: sessionError } = await getSupabaseServer().auth.signInWithPassword({
      email: finalEmail,
      password,
    });

    if (sessionError || !sessionData.session) {
      return NextResponse.json({ success: true, userId, family_id: familyId });
    }

    const { data: fullProfile, error: fullProfileError } = await getSupabaseServer()
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fullProfileError || !fullProfile) {
      return NextResponse.json({
        success: true,
        userId,
        family_id: familyId,
        session: sessionData.session,
        profile: null,
        warning: fullProfileError?.message || 'โหลดโปรไฟล์ไม่สำเร็จ',
      });
    }

    return NextResponse.json({
      success: true,
      userId,
      family_id: familyId,
      session: sessionData.session,
      profile: fullProfile,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
