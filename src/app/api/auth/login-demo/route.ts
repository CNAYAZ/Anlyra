import { type NextRequest, NextResponse } from 'next/server';
import { buildPublicUrl } from '@/lib/url';

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

  const redirectUrl = buildPublicUrl(`/${validLocale}/overview`, req);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  response.cookies.set('pro_session', JSON.stringify(DEMO_SESSION), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
