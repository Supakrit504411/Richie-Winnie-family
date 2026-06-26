import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { assertAppAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const access = await assertAppAdmin(userId);
  return NextResponse.json({ isAdmin: access.ok });
}
