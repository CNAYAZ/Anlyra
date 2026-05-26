import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const ORG_COOKIE = 'current_org_id';

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: { organizationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const organizationId = body.organizationId || '';
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId },
  });
  if (!membership) {
    return NextResponse.json({ error: 'NOT_A_MEMBER' }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.membership.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.membership.update({
      where: { id: membership.id },
      data: { isDefault: true },
    }),
  ]);

  const res = NextResponse.json({ success: true });
  res.cookies.set(ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
