import { type NextRequest, NextResponse } from 'next/server';
import { buildPublicUrl } from '@/lib/url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('locale');
  const validLocale = ['it', 'en'].includes(String(raw)) ? String(raw) : 'it';

  const redirectUrl = buildPublicUrl(`/${validLocale}`, req);
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
