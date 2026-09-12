import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { issueVerificationEmail } from '@/lib/auth/verification';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { authRateLimitResponse } from '@/lib/api/rate-limit-response';
import { DEMO_EMAIL } from '@/lib/session';

/**
 * POST /api/auth/resend-verification — issues a fresh 24h verification token
 * and re-sends the confirmation email, for an account whose original link
 * expired. Same token generation, expiry and email template as registration
 * (issueVerificationEmail, src/lib/auth/verification.ts): registering again
 * with the same address is a no-op (see /api/auth/register), so without this
 * route an expired link was a dead end.
 *
 * Public and unauthenticated by nature (the whole point is to help someone
 * who cannot sign in yet), so it is held to the same enumeration-safety rule
 * as /api/auth/forgot-password: the response is IDENTICAL — `{ success: true
 * }` — whether the address exists, is already verified, or is the demo
 * account. Only the rate-limit responses differ, exactly as in
 * forgot-password; a 429/503 is not a leak because it is deterministic in
 * the request rate, not in whether the address exists.
 */
export async function POST(req: Request) {
  const ipLimit = await checkRateLimit('resend-verification-ip', getClientIp(req));
  if (!ipLimit.success) return authRateLimitResponse(ipLimit);

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();

  if (email) {
    // Per-email cap (anti email-bombing), same bucket shape as forgot-email.
    const emailLimit = await checkRateLimit('resend-verification-email', email);
    if (!emailLimit.success) return authRateLimitResponse(emailLimit);

    if (email === DEMO_EMAIL) {
      // Same exclusion as the password provider and onboarding (DEMO_EMAIL,
      // src/lib/session.ts): the demo address never gets a real, writable
      // account, so there is nothing here to verify.
      console.info('[email] resend-verification skipped — demo address');
    } else {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Distinguishes "no matching account" in the logs, without logging
        // the address in full — the response below stays identical either way.
        console.info('[email] resend-verification skipped — no account for this address');
      } else if (user.emailVerifiedAt) {
        // Already verified: nothing to (re)send, but say nothing different.
        console.info('[email] resend-verification skipped — already verified');
      } else {
        await issueVerificationEmail(user);
      }
    }
  }

  return NextResponse.json({ success: true });
}
