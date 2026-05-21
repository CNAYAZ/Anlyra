import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEMO_SESSION = {
  userId: 'demo-user',
  email: 'demo@pro.app',
  name: 'Demo User',
  organizationId: 'demo-org',
  plan: 'PRO',
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const raw = formData.get('locale');
  const validLocale = ['it', 'en'].includes(String(raw)) ? String(raw) : 'it';

  // Next.js 14 requires absolute URLs in NextResponse.redirect.
  // Using req.nextUrl.origin preserves the original request host correctly
  // behind reverse proxies (Codespace, Vercel preview, production domains).
  // Do NOT use relative paths - they cause 500 "URL is malformed" errors.
  const redirectUrl = new URL(`/${validLocale}/overview`, req.nextUrl.origin);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  response.cookies.set('pro_session', JSON.stringify(DEMO_SESSION), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
