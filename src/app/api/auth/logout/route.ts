import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('locale');
  const validLocale = ['it', 'en'].includes(String(raw)) ? String(raw) : 'it';

  // Next.js 14 requires absolute URLs in NextResponse.redirect.
  // Using req.nextUrl.origin preserves the original request host correctly
  // behind reverse proxies (Codespace, Vercel preview, production domains).
  // Do NOT use relative paths - they cause 500 "URL is malformed" errors.
  const redirectUrl = new URL(`/${validLocale}`, req.nextUrl.origin);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  // Delete the session cookie so the landing-page auth gate treats the user as
  // unauthenticated and does NOT redirect them back to /overview.
  response.cookies.set('pro_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
