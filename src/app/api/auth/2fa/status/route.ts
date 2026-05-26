import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ enabled: false, hasPassword: false, authenticated: false });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabledAt: true, passwordHash: true },
  });
  return NextResponse.json({
    authenticated: true,
    enabled: !!user?.twoFactorEnabledAt,
    hasPassword: !!user?.passwordHash,
  });
}
