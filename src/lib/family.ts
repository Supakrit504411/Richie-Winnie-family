export function generateInviteCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function submissionStatusEmoji(status?: string): string {
  if (status === 'approved') return '✅';
  if (status === 'pending') return '⏳';
  if (status === 'rejected') return '❌';
  return '⬜';
}
