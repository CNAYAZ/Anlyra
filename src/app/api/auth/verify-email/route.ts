import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { signIn } from '@/auth';

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

  // Read-only peek, ONLY to pick the language of the redirect below. It decides
  // nothing: the 'email-verify' provider re-reads the token, re-checks it and is
  // what actually consumes it, so a stale or wrong read here cannot grant
  // anything. Done before the exchange, while the token is still present.
  const pending = await prisma.user.findUnique({
    where: { emailVerifyToken: token },
    select: { locale: true },
  });
  const locale = pending?.locale === 'en' ? 'en' : 'it';

  // Confirming the address IS the proof of ownership, so it now produces the
  // session instead of leaving the visitor anonymous on /welcome — where the
  // "start setup" button then bounced them to /login, because /onboarding is
  // gated in the middleware. The token is validated and consumed inside the
  // provider (src/auth.ts, id 'email-verify'), in the same statement that
  // creates the session: one link, one session, never reusable.
  let signedIn: string | null = null;
  try {
    signedIn = await signIn('email-verify', {
      token,
      redirect: false,
      redirectTo: `/${locale}/welcome`,
    });
  } catch {
    signedIn = null;
  }

  // authorize() returning null lands on the error page with `error=` in the
  // query: invalid, expired, already used, or refused (deletion pending, demo
  // address, 2FA). All of them are one message to the visitor — the login page
  // already renders `token_invalid` and tells them to request a new link.
  const failed = !signedIn || new URL(signedIn, origin).searchParams.has('error');
  if (failed) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=token_invalid`, origin));
  }

  return NextResponse.redirect(new URL(`/${locale}/welcome`, origin));
}
