/** Server-side: block public registration when REGISTRATION_OPEN=false */
export function isRegistrationOpen(): boolean {
  return process.env.REGISTRATION_OPEN !== 'false';
}

/** Optional secret required when creating a new family (parent register create mode) */
export function registrationSecretRequired(): string | null {
  const secret = process.env.REGISTRATION_SECRET?.trim();
  return secret || null;
}

export function verifyRegistrationSecret(provided: unknown): boolean {
  const required = registrationSecretRequired();
  if (!required) return true;
  return String(provided ?? '').trim() === required;
}
