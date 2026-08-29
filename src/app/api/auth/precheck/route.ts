import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, resetRateLimit } from '@/lib/rate-limit';
import { authRateLimitResponse } from '@/lib/api/rate-limit-response';


// Lightweight credential pre-check so the login UI can branch (reveal the 2FA
// field, prompt email verification) before calling NextAuth signIn — which in
// v5 masks all authorize() errors as a generic "CredentialsSignin".
export async function POST(req: Request) {
  // Rate limit BEFORE any bcrypt work: this is the main password-guessing oracle.
  const ipLimit = await checkRateLimit('login-ip', getClientIp(req));
  if (!ipLimit.success) return authRateLimitResponse(ipLimit);

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
  if (!emailLimit.success) return authRateLimitResponse(emailLimit);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return NextResponse.json({ valid: false });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ valid: false });

  // The password is correct, so this attempt was not a guess: give the per-email
  // budget back. Without this the user pays for their own successful logins and
  // eventually locks themselves out — and they pay MORE than someone who types
  // the wrong password, since a correct one also goes on to spend a token in
  // authorize().
  //
  // Only 'login-email' is cleared, never 'login-ip'. That distinction is the
  // security-relevant part: someone holding one valid account could otherwise
  // log into it repeatedly to wipe the per-IP counter and keep hammering OTHER
  // addresses from the same machine for free. The per-IP budget must keep
  // counting everything that comes from that IP, correct or not.
  await resetRateLimit('login-email', email);

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
