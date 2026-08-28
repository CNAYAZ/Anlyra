import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { auditLog } from '@/lib/audit/log';
import { checkRateLimit } from '@/lib/rate-limit';
import { authRateLimitResponse } from '@/lib/api/rate-limit-response';

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // Rate limit per user. Succeeding here REMOVES a security control, and it is
  // gated by a bcrypt.compare against the account password, so it gets a
  // stricter budget than change-password. FAIL-CLOSED.
  const rl = await checkRateLimit('2fa-disable-user', userId);
  if (!rl.success) return authRateLimitResponse(rl);

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // Password-protected users must confirm; OAuth-only users (no hash) skip it.
  if (user.passwordHash) {
    const password = body.password || '';
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'INVALID_PASSWORD' }, { status: 403 });
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorBackupCodes: null,
    },
  });

  await auditLog({ action: 'two_factor.disable', userId, req });
  return NextResponse.json({ success: true });
}
