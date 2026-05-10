import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale') ?? 'it';
  const response = NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  // Clear the custom session cookie if present
  response.cookies.delete('pro_session');
  return response;
}
