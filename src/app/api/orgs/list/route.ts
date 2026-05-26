import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ organizations: [] });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  return NextResponse.json({
    organizations: memberships.map((m) => ({
      id: m.organizationId,
      name: m.organization.name,
      role: m.role,
      isCurrent: m.isDefault,
    })),
  });
}
