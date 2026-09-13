import { prisma } from '@/lib/prisma';
import { generateToken, siteUrl } from '@/lib/auth/tokens';
import { sendEmail, verifyEmailTemplate } from '@/lib/email';

export const VERIFY_EXPIRY_HOURS = 24;

/**
 * Issues a fresh email-verification token for `user` and sends the
 * confirmation email. Shared by /api/auth/register (new account) and
 * /api/auth/resend-verification (existing, unverified account) so the token
 * lifetime, generation, and email template stay in exactly one place.
 *
 * Writing the new token OVERWRITES emailVerifyToken unconditionally: the
 * previous token (if any) stops matching any row the moment this returns,
 * so it can never be exchanged for a session again — issuing a new one always
 * invalidates the old one, there is no window where both are valid.
 */
export async function issueVerificationEmail(user: {
  id: string;
  email: string;
  name: string | null;
  locale?: string | null;
}): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + VERIFY_EXPIRY_HOURS * 60 * 60 * 1000);
  const locale = user.locale === 'en' ? 'en' : 'it';

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: token, emailVerifyExpiresAt: expiresAt },
  });

  // The link itself stays locale-agnostic on purpose: /api/auth/verify-email
  // (route.ts) re-reads the SAME User.locale from the token at click time and
  // redirects to the right /${locale}/welcome — see the comment there. Only
  // the email TEXT needs the locale resolved here.
  const verifyUrl = `${siteUrl()}/api/auth/verify-email?token=${token}`;
  const sendResult = await sendEmail({
    to: user.email,
    subject: locale === 'en' ? 'Confirm your email to activate Anlyra' : 'Conferma la tua email per attivare Anlyra',
    html: verifyEmailTemplate({
      userName: user.name || user.email,
      userEmail: user.email,
      verifyUrl,
      expiryHours: VERIFY_EXPIRY_HOURS,
      locale,
    }),
  });
  if (!sendResult.success) {
    console.error('[email] verify-email failed', { to: user.email, reason: sendResult.error });
  }
}
