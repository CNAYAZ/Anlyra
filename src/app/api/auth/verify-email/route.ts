import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const origin = url.origin;

  // Rate limit BEFORE the token lookup. This endpoint is PUBLIC and looks the
  // token up directly (findUnique on emailVerifyToken), which makes it a
  // guessing oracle that had no protection of any kind. FAIL-CLOSED, like every
  // other auth path.
  //
  // Refusals redirect instead of returning JSON: this URL is opened by clicking
  // a link in an email, so the caller is a BROWSER, and a raw JSON body would be
  // shown as text on a blank page. `error=rate_limited` /
  // `error=service_unavailable` are rendered as proper messages by the login
  // page, which already reads this parameter for `token_invalid`.
  const rl = await checkRateLimit('verify-email-ip', getClientIp(req));
  if (!rl.success) {
    const code = rl.reason === 'unavailable' ? 'service_unavailable' : 'rate_limited';
    return NextResponse.redirect(new URL(`/it/login?error=${code}`, origin));
  }

  if (!token) {
    return NextResponse.redirect(new URL('/it/login?error=token_invalid', origin));
  }

  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });
  if (!user || !user.emailVerifyExpiresAt || user.emailVerifyExpiresAt < new Date()) {
    return NextResponse.redirect(new URL('/it/login?error=token_invalid', origin));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerified: new Date(),
      emailVerifyToken: null,
      emailVerifyExpiresAt: null,
    },
  });

  const locale = user.locale === 'en' ? 'en' : 'it';
  return NextResponse.redirect(new URL(`/${locale}/welcome`, origin));
}
