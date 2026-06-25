import { NextResponse } from 'next/server';

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
  let anonError = '';
  let serviceError = '';

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

  return NextResponse.json({
    ok: anonOk && serviceOk,
    anonOk,
    serviceOk,
    anonError: anonError || null,
    serviceError: serviceError || null,
    hint: !serviceOk
      ? 'service_role key ไม่ถูกต้อง — ไป Supabase → Settings → API → service_role → Reveal → คัดลอกใหม่ทั้งก้อน'
      : null,
  });
}
