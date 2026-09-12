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

    // Pending invites: created, not yet accepted, not yet expired. The GET did
    // not expose these at all (there was no way to create one outside
    // onboarding, so there was nothing to show); now that the Team page can
    // send invites, it also has to show which ones are still outstanding, or
    // the same person gets invited twice with no sign of the first attempt.
    // The token is NOT included: it is the credential that grants membership,
    // and the page only needs to say who was invited, as what, and until when.
    const invites = await prisma.invite.findMany({
      where: { organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    });

    return ok({ members, invites });
  } catch (e) {
    return failFromError(e);
  }
}
