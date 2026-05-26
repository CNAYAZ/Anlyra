import { type NextRequest, NextResponse } from 'next/server';
import { buildPublicUrl } from '@/lib/url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Full-reload logout target (see UserMenu): clears the NextAuth JWT session
// cookie(s) and the legacy demo cookie, then redirects to the localized login.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('locale');
  const validLocale = ['it', 'en'].includes(String(raw)) ? String(raw) : 'it';

  const redirectUrl = buildPublicUrl(`/${validLocale}/login`, req);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  const expire = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 0 };
  // NextAuth v5 JWT cookie (dev + secure variants) and the org selection cookie.
  response.cookies.set('authjs.session-token', '', expire);
  response.cookies.set('__Secure-authjs.session-token', '', { ...expire, secure: true });
  response.cookies.set('current_org_id', '', expire);
  // Legacy demo cookie.
  response.cookies.set('pro_session', '', expire);

  return response;
}
