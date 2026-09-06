import { ok, fail, failFromError } from '@/lib/api';
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
      // Membership.joinedAt, not User.createdAt: the column the page labels
      // "Iscritto il" means when this person joined THIS organization, not
      // when they first created an Anlyra account. The two coincide only for
      // whoever created the organization (account and membership are born the
      // same instant); for anyone invited later, User.createdAt is the date
      // they registered — possibly with a different organization first, or
      // long before joining this one.
      joinedAt: m.joinedAt,
    }));
    return ok({ members });
  } catch (e) {
    return failFromError(e);
  }
}
