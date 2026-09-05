import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken, siteUrl } from '@/lib/auth/tokens';
import { sendEmail, passwordResetTemplate } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { authRateLimitResponse } from '@/lib/api/rate-limit-response';

const RESET_EXPIRY_MINUTES = 30;


export async function POST(req: Request) {
  const ipLimit = await checkRateLimit('forgot-ip', getClientIp(req));
  if (!ipLimit.success) return authRateLimitResponse(ipLimit);

  let body: { email?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const locale = body.locale === 'en' ? 'en' : 'it';

  // Always respond 200 to avoid email enumeration.
  if (email) {
    // Per-email cap on reset emails (anti email-bombing). 429 is count-based and
    // reveals nothing about whether the account exists.
    const emailLimit = await checkRateLimit('forgot-email', email);
    if (!emailLimit.success) return authRateLimitResponse(emailLimit);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpiresAt: expiresAt },
      });

      const resetUrl = `${siteUrl()}/${locale}/reset-password?token=${token}`;
      // sendEmail never throws (it catches internally and returns
      // {success,error} — see send.ts), so a .catch() here caught nothing; it
      // only looked like error handling. Checking the result is what actually
      // leaves a trace when delivery fails, without touching the 200 below.
      const sendResult = await sendEmail({
        to: email,
        subject: 'Reimposta la tua password Anlyra',
        html: passwordResetTemplate({
          userName: user.name || email,
          userEmail: email,
          resetUrl,
          expiryMinutes: RESET_EXPIRY_MINUTES,
        }),
      });
      if (!sendResult.success) {
        console.error('[email] password-reset failed', { to: email, reason: sendResult.error });
      }
    } else {
      // Distinguishes "no matching account" from a successful or failed send in
      // the logs, without logging the address that was tried in full (it may
      // not even be a real account) — the response below stays identical either way.
      console.info('[email] password-reset skipped — no account for this address');
    }
  }

  return NextResponse.json({ success: true });
}
