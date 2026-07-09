import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { validatePassword, PASSWORD_POLICY } from '@/lib/auth/config';
import { checkRateLimit, getClientIp, retryAfterSeconds } from '@/lib/rate-limit';

function tooManyRequests(reset: number) {
  return NextResponse.json(
    { error: 'TOO_MANY_REQUESTS' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(reset)) } },
  );
}

export async function POST(req: Request) {
  const ipLimit = await checkRateLimit('reset-ip', getClientIp(req));
  if (!ipLimit.success) return tooManyRequests(ipLimit.reset);

  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const token = body.token || '';
  const password = body.password || '';

  if (!token) {
    return NextResponse.json({ error: 'TOKEN_REQUIRED' }, { status: 400 });
  }
  if (!validatePassword(password)) {
    return NextResponse.json(
      { error: 'WEAK_PASSWORD', message: PASSWORD_POLICY.describe },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });
  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      // A password reset implicitly proves email ownership.
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      emailVerified: user.emailVerified ?? new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
