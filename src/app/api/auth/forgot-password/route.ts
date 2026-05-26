import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken, siteUrl } from '@/lib/auth/tokens';
import { sendEmail, passwordResetTemplate } from '@/lib/email';

const RESET_EXPIRY_MINUTES = 30;

export async function POST(req: Request) {
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
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpiresAt: expiresAt },
      });

      const resetUrl = `${siteUrl()}/${locale}/reset-password?token=${token}`;
      await sendEmail({
        to: email,
        subject: 'Reimposta la tua password Anlyra',
        html: passwordResetTemplate({
          userName: user.name || email,
          userEmail: email,
          resetUrl,
          expiryMinutes: RESET_EXPIRY_MINUTES,
        }),
      }).catch(() => {
        // best-effort
      });
    }
  }

  return NextResponse.json({ success: true });
}
