import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { generateBackupCodes } from '@/lib/auth/tokens';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { authRateLimitResponse } from '@/lib/api/rate-limit-response';
import { auditLog } from '@/lib/audit/log';


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

  const backupCodes = generateBackupCodes(10);
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabledAt: new Date(),
      twoFactorBackupCodes: JSON.stringify(backupCodes),
    },
  });

  await auditLog({ action: 'two_factor.enable', userId, req });
  return NextResponse.json({ success: true, backupCodes });
}
