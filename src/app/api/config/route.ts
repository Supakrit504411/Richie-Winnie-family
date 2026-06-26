import { NextResponse } from 'next/server';
import { isRegistrationOpen, registrationSecretRequired } from '@/lib/registration';

export async function GET() {
  return NextResponse.json({
    registrationOpen: isRegistrationOpen(),
    registrationSecretRequired: Boolean(registrationSecretRequired()),
  });
}
