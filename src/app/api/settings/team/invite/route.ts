import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireManagerRole } from '@/lib/auth/require-role';
import { checkRateLimit } from '@/lib/rate-limit';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';
import { issueTeamInvite, INVITABLE_ROLES } from '@/lib/invites/issue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Same permissive shape the onboarding route accepts for an invite address
// (/\S+@\S+\.\S+/): deliberately identical, so an address that can be invited
// during onboarding can also be invited later, and neither route is the odd
// one out. The real protection against a hostile address is in the email
// template (escapeHtml / escapeMailtoAddress), not in this test.
const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().regex(/\S+@\S+\.\S+/, 'INVALID_EMAIL'),
  role: z.enum(INVITABLE_ROLES),
});

/**
 * POST /api/settings/team/invite — invite one person into the organization
 * that the caller is currently acting in.
 *
 * Until now prisma.invite.create existed in ONE place in the whole product,
 * inside POST /api/onboarding/organization: invites could only be sent while
 * the organization was being created, and never afterwards. The accept side
 * (/api/invite/accept, /invite/[token]) was already complete — only the
 * issuing half was missing.
 *
 * The organization is NEVER taken from the request: it comes from
 * getAuthContext(), which resolves it only through a Membership row linking it
 * to the signed-in user. So an invite can only ever be created for the
 * organization the caller actually belongs to, and the accept route reads the
 * organization from the invite row itself — there is no path by which this
 * route could invite someone into a different organization.
 */
export async function POST(req: NextRequest) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);

    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;

    // Founder decision: owner and admin may invite, same as the other twelve
    // management routes. Fail-closed — an unknown or missing role is denied.
    const denied = requireManagerRole(authCtx);
    if (denied) return denied;

    // Keyed per user, not per IP: the action is authenticated and already
    // role-gated, so the budget belongs to the person spending it.
    const rl = await checkRateLimit('team-invite-user', authCtx.userId);
    if (!rl.success) return rateLimitResponse(rl);

    const parsed = inviteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'INVALID_EMAIL', 400);
    }
    const { email, role } = parsed.data;
    const { organizationId, userId } = authCtx;

    // Cannot invite yourself. This is the same trap the onboarding route
    // closes by filtering the creator's own address out of the batch: an
    // invite addressed to yourself is a link that, once accepted, used to
    // overwrite your own membership role. accept/route.ts no longer does that
    // (it refuses to touch an existing membership), but the invite is
    // meaningless either way — you are already in. Unlike onboarding, which
    // silently skips it inside a batch, here there is exactly one recipient
    // and a person watching the screen, so it is refused out loud.
    if (authCtx.email && email === authCtx.email.trim().toLowerCase()) {
      return fail('SELF_INVITE', 400);
    }

    // Already a member of THIS organization: no invite. Checked through the
    // User row, because Invite.email is an address while Membership is keyed
    // by user id — an address that has no account yet cannot be a member, so
    // a missing User is simply "not a member".
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      const membership = await prisma.membership.findUnique({
        where: { userId_organizationId: { userId: existingUser.id, organizationId } },
        select: { id: true },
      });
      if (membership) return fail('ALREADY_MEMBER', 409);
    }

    // An invite for this address in this organization that is still open (not
    // accepted, not expired): refresh it instead of stacking a second one.
    // There is no unique constraint on (email, organizationId), so repeated
    // clicks used to be able to pile up rows that all stay clickable.
    // Refreshing rather than refusing is the more useful behaviour: the common
    // reason to invite the same person twice is that the first email was lost
    // or the link went stale, and the person inviting wants a working link —
    // which is the same reasoning already applied to re-sending an email
    // verification. It also lets a mistaken role be corrected by simply
    // inviting again. issueTeamInvite writes the new token over the old one in
    // the same statement, so the superseded link dies immediately rather than
    // leaving two valid ways in.
    const openInvite = await prisma.invite.findFirst({
      where: {
        email,
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    if (!org) return fail('NOT_FOUND', 404);

    const inviter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const result = await issueTeamInvite({
      organizationId,
      orgName: org.name,
      inviterId: userId,
      inviterName: inviter?.name ?? null,
      inviterEmail: inviter?.email ?? null,
      email,
      role,
      existingInviteId: openInvite?.id,
    });

    // The invite row exists either way, so this is a 200 — but `emailSent`
    // carries the delivery outcome, because an invite whose email never left
    // is useless to the person who sent it and the page has to be able to
    // warn them. issueTeamInvite has already logged the reason server-side.
    return ok({
      email,
      role,
      reissued: !!openInvite,
      emailSent: result.emailSent,
    });
  } catch (e) {
    return failFromError(e);
  }
}
