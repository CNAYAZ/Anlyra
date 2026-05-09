import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { organizationId } = await getCurrentContext();
    const memberships = await prisma.membership.findMany({
      where: { organizationId },
      include: { user: true },
    });
    const members = memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.user.createdAt,
    }));
    return ok({ members });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
