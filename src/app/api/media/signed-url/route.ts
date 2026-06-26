import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getAuthUserId } from '@/lib/api-auth';
import { isSupabaseStorageUrl, parseStorageObjectUrl } from '@/lib/storage-url';
import { assertAppAdmin } from '@/lib/admin';

async function canAccessFile(viewerId: string, ownerId: string): Promise<boolean> {
  if (viewerId === ownerId) return true;

  const server = getSupabaseServer();
  const { data: viewer } = await server
    .from('users')
    .select('id, role, family_id')
    .eq('id', viewerId)
    .single();

  const { data: owner } = await server
    .from('users')
    .select('id, role, family_id, parent_id')
    .eq('id', ownerId)
    .single();

  if (!viewer || !owner) return false;

  if (viewer.role === 'parent') {
    const sameFamily =
      viewer.family_id && owner.family_id && viewer.family_id === owner.family_id;
    const legacyParent = owner.parent_id === viewer.id;
    return Boolean(sameFamily || legacyParent);
  }

  return false;
}

/** Return a short-lived signed URL for private Supabase Storage objects */
export async function GET(request: NextRequest) {
  try {
    const viewerId = await getAuthUserId(request);
    if (!viewerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = request.nextUrl.searchParams.get('url');
    if (!url || !isSupabaseStorageUrl(url)) {
      return NextResponse.json({ error: 'Invalid storage URL' }, { status: 400 });
    }

    const parsed = parseStorageObjectUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: 'Could not parse storage URL' }, { status: 400 });
    }

    const ownerId = parsed.path.split('/')[0];
    if (!ownerId) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const adminAccess = await assertAppAdmin(viewerId);
    const allowed = adminAccess.ok || (await canAccessFile(viewerId, ownerId));
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await getSupabaseServer()
      .storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 60 * 60);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || 'Sign failed' }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
