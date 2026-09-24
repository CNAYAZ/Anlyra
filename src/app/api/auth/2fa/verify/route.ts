import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { generateBackupCodes } from '@/lib/auth/tokens';
import { checkRateLimit, getClientIp, resetRateLimit } from '@/lib/rate-limit';
import { authRateLimitResponse } from '@/lib/api/rate-limit-response';
import { auditLog } from '@/lib/audit/log';
import { reissueCurrentSession } from '@/lib/auth/session-revocation';


export async function POST(req: Request) {
  const ipLimit = await checkRateLimit('2fa-ip', getClientIp(req));
  if (!ipLimit.success) return authRateLimitResponse(ipLimit);

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const code = (body.code || '').trim();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: 'NO_SETUP' }, { status: 400 });
  }

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code,
    window: 1,
  });
  if (!valid) {
    return NextResponse.json({ error: 'INVALID_CODE' }, { status: 400 });
  }

  // Correct code: give the budget back. Same defect as login had — 5 attempts
  // per 10 minutes was being spent by SUCCESSES too, so a user who set up 2FA,
  // removed it and set it up again could lock themselves out of their own
  // second factor. Wrong codes still consume, which is the whole point.
  await resetRateLimit('2fa-ip', getClientIp(req));

  const backupCodes = generateBackupCodes(10);
  // Enabling 2FA also revokes every OTHER session, same reasoning and same
  // mechanism as a password change (src/lib/auth/session-revocation.ts):
  // someone who turns 2FA on because they fear an intrusion must not leave
  // that intruder signed in on a session opened before this moment.
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabledAt: new Date(),
      twoFactorBackupCodes: JSON.stringify(backupCodes),
      sessionsRevokedAt: new Date(),
    },
  });

  await auditLog({ action: 'two_factor.enable', userId, req });

  // THIS session must survive its own revocation, same as change-password:
  // renew it AFTER the write, so the new token is never older than the
  // revocation instant.
  const res = NextResponse.json({ success: true, backupCodes });
  const renewed = await reissueCurrentSession(req);
  if (renewed) res.cookies.set(renewed.name, renewed.value, renewed.options);
  return res;
}
