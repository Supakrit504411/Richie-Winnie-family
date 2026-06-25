import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !anon || !service) {
    return NextResponse.json({
      ok: false,
      message: 'ขาด env: URL, anon key หรือ service_role key',
      hasUrl: !!url,
      hasAnon: !!anon,
      hasService: !!service,
    });
  }

  let anonOk = false;
  let serviceOk = false;
  let familiesOk = false;
  let anonError = '';
  let serviceError = '';
  let familiesError: string | null = null;

  try {
    const anonRes = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
    });
    anonOk = anonRes.ok;
    if (!anonOk) {
      const body = await anonRes.json().catch(() => ({}));
      anonError = body.message || body.error || anonRes.statusText;
    }
  } catch (e) {
    anonError = e instanceof Error ? e.message : 'anon check failed';
  }

  try {
    const serviceRes = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1`, {
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
      },
    });
    serviceOk = serviceRes.ok;
    if (!serviceOk) {
      const body = await serviceRes.json().catch(() => ({}));
      serviceError = body.message || body.msg || body.error || serviceRes.statusText;
    }
  } catch (e) {
    serviceError = e instanceof Error ? e.message : 'service check failed';
  }

  try {
    const { error } = await getSupabaseServer().from('families').select('id').limit(1);
    familiesOk = !error;
    if (error) {
      familiesError = error.message;
    }
  } catch (e) {
    familiesError = e instanceof Error ? e.message : 'families check failed';
  }

  let usersOk = false;
  let usersError: string | null = null;
  try {
    const { error } = await getSupabaseServer().from('users').select('id').limit(1);
    usersOk = !error;
    if (error) usersError = error.message;
  } catch (e) {
    usersError = e instanceof Error ? e.message : 'users check failed';
  }

  let rawUsersOk = false;
  let rawUsersError: string | null = null;
  try {
    const rawRes = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
      headers: {
        apikey: service!,
        Authorization: `Bearer ${service}`,
      },
    });
    rawUsersOk = rawRes.ok;
    if (!rawRes.ok) {
      rawUsersError = await rawRes.text();
    }
  } catch (e) {
    rawUsersError = e instanceof Error ? e.message : 'raw users check failed';
  }

  const allOk = anonOk && serviceOk && familiesOk && usersOk;

  return NextResponse.json({
    ok: allOk,
    anonOk,
    serviceOk,
    familiesOk,
    usersOk,
    rawUsersOk,
    anonError: anonError || null,
    serviceError: serviceError || null,
    familiesError,
    usersError,
    rawUsersError,
    hint: !serviceOk
      ? 'service_role key ไม่ถูกต้อง — ไป Supabase → Settings → API → service_role → Reveal → คัดลอกใหม่ทั้งก้อน'
      : !familiesOk
        ? 'ยังไม่มีตาราง families — เปิด Supabase → SQL Editor → รัน supabase-migration-v2-families.sql'
        : null,
  });
}
