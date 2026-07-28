import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, retryAfterSeconds } from '@/lib/rate-limit';

function tooManyRequests(reset: number) {
  return NextResponse.json(
    { error: 'TOO_MANY_REQUESTS' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(reset)) } },
  );
}

// Lightweight credential pre-check so the login UI can branch (reveal the 2FA
// field, prompt email verification) before calling NextAuth signIn — which in
// v5 masks all authorize() errors as a generic "CredentialsSignin".
export async function POST(req: Request) {
  // Rate limit BEFORE any bcrypt work: this is the main password-guessing oracle.
  const ipLimit = await checkRateLimit('login-ip', getClientIp(req));
  if (!ipLimit.success) return tooManyRequests(ipLimit.reset);

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email || !password) return NextResponse.json({ valid: false });

  // Per-email limit catches targeted attacks even from rotating IPs.
  const emailLimit = await checkRateLimit('login-email', email);
  if (!emailLimit.success) return tooManyRequests(emailLimit.reset);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return NextResponse.json({ valid: false });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ valid: false });

  return NextResponse.json({
    valid: true,
    emailVerified: !!user.emailVerifiedAt,
    needs2fa: !!user.twoFactorEnabledAt,
    // NextAuth v5 collapses every authorize() error into a generic
    // "CredentialsSignin", so the reason travels here instead: it lets the login
    // form tell a closed account apart from a wrong password. The account is
    // blocked in authorize() regardless of what this pre-check reports.
    deletionRequested: !!user.deletionRequestedAt,
  });
}
