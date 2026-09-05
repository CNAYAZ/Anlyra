import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { validatePassword, PASSWORD_POLICY } from '@/lib/auth/config';
import { generateToken, siteUrl } from '@/lib/auth/tokens';
import { sendEmail, verifyEmailTemplate } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { authRateLimitResponse } from '@/lib/api/rate-limit-response';
import { hasControlChars } from '@/lib/validation/display-name';

const VERIFY_EXPIRY_HOURS = 24;


export async function POST(req: Request) {
  const ipLimit = await checkRateLimit('register-ip', getClientIp(req));
  if (!ipLimit.success) return authRateLimitResponse(ipLimit);

  let body: { name?: string; email?: string; password?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const locale = body.locale === 'en' ? 'en' : 'it';

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 });
  }
  // No schema previously validated this at all — unlike settings/profile's
  // PATCH (same User.name column, z.string().min(1).max(100)), this route had
  // no length cap and no character filter. Matching that route's cap here,
  // plus the control-character rule shared with it: this name can later be
  // shown to OTHER people (e.g. as the inviter's name in a team-invite email),
  // not just to the person who typed it.
  if (name.length > 100 || hasControlChars(name)) {
    return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 });
  }
  if (!validatePassword(password)) {
    return NextResponse.json(
      { error: 'WEAK_PASSWORD', message: PASSWORD_POLICY.describe },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Do not leak which emails exist; respond as success with neutral message.
    return NextResponse.json({ success: true, message: 'CHECK_EMAIL' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const token = generateToken();
  const expiresAt = new Date(Date.now() + VERIFY_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.user.create({
    data: {
      email,
      name: name || null,
      locale,
      passwordHash,
      emailVerifyToken: token,
      emailVerifyExpiresAt: expiresAt,
    },
  });

  const verifyUrl = `${siteUrl()}/api/auth/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Conferma la tua email per attivare Anlyra',
    html: verifyEmailTemplate({
      userName: name || email,
      userEmail: email,
      verifyUrl,
      expiryHours: VERIFY_EXPIRY_HOURS,
    }),
  }).catch(() => {
    // email delivery is best-effort; verification can be re-requested
  });

  return NextResponse.json({ success: true, message: 'CHECK_EMAIL' });
}
