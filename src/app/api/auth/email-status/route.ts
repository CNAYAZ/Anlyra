import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, retryAfterSeconds } from '@/lib/rate-limit';

function tooManyRequests(reset: number) {
  return NextResponse.json(
    { error: 'TOO_MANY_REQUESTS' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(reset)) } },
  );
}

export async function GET(req: Request) {
  const ipLimit = await checkRateLimit('email-status-ip', getClientIp(req));
  if (!ipLimit.success) return tooManyRequests(ipLimit.reset);

  const url = new URL(req.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ verified: false });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerifiedAt: true },
  });

  return NextResponse.json({ verified: !!user?.emailVerifiedAt });
}
