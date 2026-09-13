import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext, getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireManagerRole } from '@/lib/auth/require-role';

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

/**
 * DELETE /api/settings/team?id=<inviteId> — revoke a pending invite.
 *
 * Unlike GET above, this is a write: getAuthContext() (never falls back to
 * the demo org) plus requireWritableOrg (demo is read-only) and
 * requireManagerRole (owner/admin only, same as issuing the invite).
 *
 * The lookup filters on { id, organizationId } TOGETHER in one query — the
 * same shape used by every other route that fetches a resource by id scoped
 * to the caller's organization (receivables/[id], recurring-expenses/[id],
 * custom-dashboards/[id], reports/[id]: all `findFirst({ where: { id,
 * organizationId } })`). An invite that does not exist and an invite that
 * belongs to a DIFFERENT organization both simply fail to match and get the
 * same NOT_FOUND — never a 403 that would let a caller distinguish "wrong
 * organization" from "no such id" and so map out which ids exist elsewhere.
 */
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

    const invite = await prisma.invite.findFirst({
      where: { id: inviteId, organizationId: authCtx.organizationId },
      select: { id: true, acceptedAt: true },
    });
    if (!invite) return fail('NOT_FOUND', 404);

    // Cannot revoke an invite that has already been accepted — it is no
    // longer a pending offer, it is how an existing member joined.
    if (invite.acceptedAt) return fail('ALREADY_ACCEPTED', 409);

    // Deleting the row is what makes the link stop working: accept looks the
    // token up with prisma.invite.findUnique, and a missing row answers
    // INVITE_INVALID exactly like an unknown or expired token. Same mechanism
    // already used by report share links (DELETE /api/reports/[id]/share
    // removes shareToken).
    await prisma.invite.delete({ where: { id: invite.id } });

    return ok({ revoked: true });
  } catch (e) {
    return failFromError(e);
  }
}
