import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireManagerRole, isOwnerRole } from '@/lib/auth/require-role';
import { auditLog } from '@/lib/audit/log';
import { checkSeatAvailability } from '@/lib/billing/server-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The four values Membership.role actually takes (src/lib/auth/require-role.ts
 * documents the same set). 'owner' is assignable here — unlike an invite, which
 * may only grant admin/editor/viewer — but only BY an owner; see below.
 */
const ASSIGNABLE_ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;

const patchSchema = z.object({ role: z.enum(ASSIGNABLE_ROLES) });

/** What the guarded statement reports back, whether or not it changed a row. */
type MemberGuardRow = {
  target_found: number;
  updated_rows: number;
  owner_count: number;
  old_role: string | null;
  target_user_id: string | null;
};

/**
 * PATCH /api/settings/team/members/[id] — change one member's role.
 *
 * ── WHY THE WHOLE THING IS ONE SQL STATEMENT ──
 * Same reasoning, and the same shape, as consumeCredits (src/lib/credits.ts):
 * the rule "this organization must always keep at least one owner" is a check
 * across OTHER rows followed by a write, and read-then-write in TypeScript is
 * exactly the race that pattern exists to avoid — two owners being demoted at
 * the same instant would both count two owners, both decide they are safe, and
 * both write, leaving zero.
 *
 * So, like consumeCredits:
 *   • the first CTE takes `FOR UPDATE` on the ORGANIZATION row before reading
 *     anything, so a second concurrent member change on the same organization
 *     blocks there and re-reads what the first one committed. The lock is on
 *     the organization rather than the membership on purpose: the invariant
 *     spans every membership of that org, so locking only the row being changed
 *     would not serialize two different rows being changed at once.
 *   • every refusal lives in the UPDATE's own WHERE, so a change that would
 *     break a rule updates NOTHING.
 * The final SELECT reports the diagnostics (did the target exist, how many
 * owners there are, what the old role was) so the handler can answer with the
 * RIGHT message instead of a single opaque failure — the enforcement is the
 * WHERE, the diagnostics only choose the wording.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);

    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;

    const denied = requireManagerRole(authCtx);
    if (denied) return denied;

    const membershipId = (await ctx.params).id;
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('INVALID_ROLE', 400);
    const newRole = parsed.data.role;

    const callerIsOwner = isOwnerRole(authCtx.role);
    const { organizationId, userId } = authCtx;

    // Seats depend on the role (plans.ts countedSeats): promoting the plan's
    // free viewer to editor takes a seat the plan may not have. A change that
    // does not raise the count — any demotion, admin↔editor — always passes.
    const seats = await checkSeatAvailability(organizationId, 'role', newRole, {
      membershipId,
    });
    if (!seats.allowed) return fail('SEAT_LIMIT_REACHED', 403);

    const rows = await prisma.$queryRaw<MemberGuardRow[]>`
      WITH locked AS (
        SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE
      ), target AS (
        SELECT m."id", m."role", m."userId"
        FROM "Membership" m, locked l
        WHERE m."id" = ${membershipId} AND m."organizationId" = l."id"
      ), owners AS (
        SELECT COUNT(*)::int AS n
        FROM "Membership" m, locked l
        WHERE m."organizationId" = l."id" AND m."role" = 'owner'
      ), updated AS (
        UPDATE "Membership" m
        SET "role" = ${newRole}
        FROM target t, owners o
        WHERE m."id" = t."id"
          -- never your own role: the self-demotion that already locked a
          -- founder out of his own organization (see restoreOwner in
          -- admin/actions.ts)
          AND t."userId" <> ${userId}
          -- only an owner may touch an owner, or create one
          AND (${callerIsOwner} OR t."role" <> 'owner')
          AND (${callerIsOwner} OR ${newRole} <> 'owner')
          -- the organization must keep at least one owner
          AND (t."role" <> 'owner' OR ${newRole} = 'owner' OR o.n > 1)
        RETURNING m."id"
      )
      SELECT
        (SELECT COUNT(*) FROM target)::int  AS target_found,
        (SELECT COUNT(*) FROM updated)::int AS updated_rows,
        (SELECT n FROM owners)              AS owner_count,
        (SELECT t."role"   FROM target t)   AS old_role,
        (SELECT t."userId" FROM target t)   AS target_user_id
    `;

    const r = rows[0];

    // Not in THIS organization — or not anywhere. One answer for both, so the
    // response cannot be used to find out which membership ids exist in other
    // organizations. Same rule (and same shape) as the other id-scoped routes.
    if (!r || r.target_found === 0) return fail('NOT_FOUND', 404);

    if (r.target_user_id === userId) return fail('CANNOT_CHANGE_OWN_ROLE', 403);
    if (!callerIsOwner && r.old_role === 'owner') return fail('OWNER_REQUIRED', 403);
    if (!callerIsOwner && newRole === 'owner') return fail('OWNER_REQUIRED', 403);
    if (r.old_role === 'owner' && newRole !== 'owner' && r.owner_count <= 1) {
      return fail('LAST_OWNER', 409);
    }

    // Every known refusal is ruled out and the row still did not change: the
    // organization was modified by someone else between the lock and here.
    if (r.updated_rows === 0) return fail('CONFLICT', 409);

    await auditLog({
      action: 'team.member_role_changed',
      userId,
      organizationId,
      targetType: 'membership',
      targetId: membershipId,
      req,
      // Roles, not names or addresses: enough to reconstruct what changed.
      metadata: { from: r.old_role ?? '', to: newRole },
    });

    return ok({ id: membershipId, role: newRole });
  } catch (e) {
    return failFromError(e);
  }
}

/**
 * DELETE /api/settings/team/members/[id] — remove a person from the team.
 *
 * Same guards as PATCH above and, like it, one statement with the
 * organization row locked first: "keep at least one owner" is the same
 * cross-row invariant, and a removal breaks it just as a demotion does.
 *
 * WHY THIS LIVES HERE AND NOT ON /api/settings/team: that path's DELETE
 * already means "revoke a pending invite". Two different destructive things
 * behind one verb on one path, told apart only by a query parameter, is how
 * the wrong one eventually gets called.
 *
 * ── WHAT DELETING A MEMBERSHIP DOES *NOT* TOUCH (verified, deliberate) ──
 *  • NotificationPref_b8 rows (userId+organizationId, no FK) survive. Nothing
 *    sends email based on them — the only readers are the settings page, the
 *    GDPR export and the GDPR purge — so they are inert, and the purge clears
 *    them if the account itself is ever deleted.
 *  • Report_b8.recipients keeps the address as text, but the scheduled-report
 *    cron re-checks every recipient against live membership before sending
 *    (splitRecipientsByMembership, src/lib/reports/recipients.ts), so a removed
 *    person stops receiving the company's figures on the very next run.
 *  • AIConversation rows survive on purpose: they are keyed by organizationId
 *    and are the ORGANIZATION's data, not the departing person's. Deleting
 *    them here would destroy company history; the removed person cannot reach
 *    them because every read resolves the org through a Membership.
 *  • Report share links are not attributable to a person at all — Report_b8 has
 *    no creator column — so there is nothing of "theirs" to revoke, and
 *    revoking the org's own links would break sharing for everyone left.
 *
 * Access ends immediately and needs no session invalidation: the JWT still
 * carries the old currentOrgId and the browser still has current_org_id, but
 * resolveSessionContext validates EVERY branch (cookie, token, fallback)
 * against a real Membership row on each request, so both simply stop
 * resolving. See the test in the report.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);

    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;

    const denied = requireManagerRole(authCtx);
    if (denied) return denied;

    const membershipId = (await ctx.params).id;
    const callerIsOwner = isOwnerRole(authCtx.role);
    const { organizationId, userId } = authCtx;

    const rows = await prisma.$queryRaw<MemberGuardRow[]>`
      WITH locked AS (
        SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE
      ), target AS (
        SELECT m."id", m."role", m."userId"
        FROM "Membership" m, locked l
        WHERE m."id" = ${membershipId} AND m."organizationId" = l."id"
      ), owners AS (
        SELECT COUNT(*)::int AS n
        FROM "Membership" m, locked l
        WHERE m."organizationId" = l."id" AND m."role" = 'owner'
      ), removed AS (
        DELETE FROM "Membership" m
        USING target t, owners o
        WHERE m."id" = t."id"
          -- you cannot remove yourself: same reasoning as the role rule, and
          -- it also stops an owner from emptying their own organization
          AND t."userId" <> ${userId}
          -- an admin may not remove an owner
          AND (${callerIsOwner} OR t."role" <> 'owner')
          -- the organization must keep at least one owner
          AND (t."role" <> 'owner' OR o.n > 1)
        RETURNING m."id"
      )
      SELECT
        (SELECT COUNT(*) FROM target)::int  AS target_found,
        (SELECT COUNT(*) FROM removed)::int AS updated_rows,
        (SELECT n FROM owners)              AS owner_count,
        (SELECT t."role"   FROM target t)   AS old_role,
        (SELECT t."userId" FROM target t)   AS target_user_id
    `;

    const r = rows[0];
    if (!r || r.target_found === 0) return fail('NOT_FOUND', 404);

    if (r.target_user_id === userId) return fail('CANNOT_REMOVE_SELF', 403);
    if (!callerIsOwner && r.old_role === 'owner') return fail('OWNER_REQUIRED', 403);
    if (r.old_role === 'owner' && r.owner_count <= 1) return fail('LAST_OWNER', 409);
    if (r.updated_rows === 0) return fail('CONFLICT', 409);

    await auditLog({
      action: 'team.member_removed',
      userId,
      organizationId,
      targetType: 'membership',
      targetId: membershipId,
      req,
      // The role that was removed, never the person's name or address.
      metadata: { role: r.old_role ?? '' },
    });

    return ok({ id: membershipId, removed: true });
  } catch (e) {
    return failFromError(e);
  }
}
