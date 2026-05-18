import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('locale');
  const validLocale = ['it', 'en'].includes(String(raw)) ? String(raw) : 'it';

  // Redirect to the public landing page (not /login) so unauthenticated users
  // see the correct page. Status 303 converts any POST-derived navigation to GET.
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
