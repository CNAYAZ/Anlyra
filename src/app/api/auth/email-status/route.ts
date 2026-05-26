import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ verified: false });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerifiedAt: true },
  });

  return NextResponse.json({ verified: !!user?.emailVerifiedAt });
}
