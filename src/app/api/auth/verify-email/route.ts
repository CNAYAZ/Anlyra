import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const origin = url.origin;

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
