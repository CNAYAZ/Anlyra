import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireManagerRole } from '@/lib/auth/require-role';
import { requireWritableOrg } from '@/lib/auth/require-writable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;
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

export async function DELETE(req: Request) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);

    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;

    const denied = requireManagerRole(authCtx);
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const inviteId = searchParams.get('id');
    if (!inviteId) return fail('MISSING_INVITE_ID', 400);

    // Verify the invite belongs to this organization (cross-tenant isolation)
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
      select: { id: true, organizationId: true, acceptedAt: true, expiresAt: true },
    });
    if (!invite) return fail('NOT_FOUND', 404);
    if (invite.organizationId !== authCtx.organizationId) return fail('FORBIDDEN', 403);

    // Cannot revoke an already accepted invite
    if (invite.acceptedAt) return fail('ALREADY_ACCEPTED', 409);

    // Delete the invite row — the token is the credential, removing the row makes
    // the link stop working immediately. This mirrors how report share tokens
    // are revoked (DELETE /api/reports/[id]/share removes the shareToken).
    await prisma.invite.delete({ where: { id: inviteId } });

    return ok({ revoked: true });
  } catch (e) {
    return failFromError(e);
  }
}
