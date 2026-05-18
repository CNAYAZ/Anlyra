import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('locale');
  const validLocale = ['it', 'en'].includes(String(raw)) ? String(raw) : 'it';

  // Use a relative path so the redirect works behind reverse proxies and
  // Codespace tunnels where req.nextUrl.origin may be localhost:3000.
  const response = NextResponse.redirect(`/${validLocale}`, { status: 303 });
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
