import bcrypt from 'bcryptjs';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { isOwnerRole, requireOwnerRole } from '@/lib/auth/require-role';
import { DELETION_GRACE_DAYS, daysRemainingInGrace, isPastGrace } from '@/lib/gdpr/constants';
import {
  soleOwnershipOf,
  scheduleSubscriptionEnd,
  unscheduleSubscriptionEnd,
  notifyDeletionCancelled,
  sendApprovalRequestEmails,
} from '@/lib/gdpr/org-deletion';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GDPR art. 17 — right to erasure. Two SEPARATE requests (founder's decision,
 * 2026-09-27; before it, an owner's or admin's request always took the whole
 * company with it, and started the 30 days at once):
 *
 *   • scope 'account' — ANYONE: their own personal account. Never waits for
 *     anyone: it is a GDPR right. It stamps User.deletionRequestedAt and the
 *     purge cron (/api/cron/gdpr-purge) removes the account after 30 days.
 *     Two cases touch a company (see soleOwnershipOf):
 *       – sole owner of a company with other people in it → refused
 *         (SOLE_OWNER) until they name another owner or ask for the company's
 *         deletion;
 *       – only member of a company → goes ahead, and at the same moment a
 *         request to delete that company is filed for the founder's
 *         confirmation, and its subscription is set to end at period end.
 *   • scope 'organization' — the OWNER only: asks to delete the whole company.
 *     Nothing is deleted or blocked: the request WAITS
 *     (Organization.deletionApprovalRequestedAt) until the founder confirms it
 *     from the admin panel (admin/actions.ts), which then starts the existing
 *     process — see src/lib/gdpr/org-deletion.ts.
 *
 * CONFIRMATION: the current password is required for both and verified with
 * bcrypt, the same check as /api/auth/change-password.
 */

/**
 * What the privacy panel needs to show, decided by the same server-side checks
 * POST uses, so the text on screen can never promise something different from
 * what happens. Company-level state is returned to the OWNER only: an admin
 * sees no option to delete the company (founder's rule).
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return fail('UNAUTHORIZED', 401);
  const isOwner = isOwnerRole(ctx.role);

  const [user, organization, ownership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { deletionRequestedAt: true, passwordHash: true },
    }),
    isOwner
      ? prisma.organization.findUnique({
          where: { id: ctx.organizationId },
          select: { deletionRequestedAt: true, deletionApprovalRequestedAt: true },
        })
      : Promise.resolve(null),
    soleOwnershipOf(ctx.userId),
  ]);
  if (!user) return fail('NOT_FOUND', 404);

  return ok({
    graceDays: DELETION_GRACE_DAYS,
    alreadyRequested: !!user.deletionRequestedAt,
    requestedAt: user.deletionRequestedAt?.toISOString() ?? null,
    daysRemaining: user.deletionRequestedAt ? daysRemainingInGrace(user.deletionRequestedAt) : null,
    canConfirmWithPassword: !!user.passwordHash,
    // Personal deletion refused while this is non-empty (option a).
    soleOwnerOf: ownership.blocking.map((o) => o.name),
    // Personal deletion also files these companies' deletion (option b).
    soleMemberOf: ownership.alone.map((o) => o.name),
    canRequestOrganizationDeletion: isOwner,
    organizationApprovalPending: organization?.deletionApprovalRequestedAt
      ? { requestedAt: organization.deletionApprovalRequestedAt.toISOString() }
      : null,
    organizationPending: organization?.deletionRequestedAt
      ? {
          requestedAt: organization.deletionRequestedAt.toISOString(),
          daysRemaining: daysRemainingInGrace(organization.deletionRequestedAt),
        }
      : null,
  });
}

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return fail('UNAUTHORIZED', 401);
  // Demo organization: read-only. See requireWritableOrg.
  const readOnly1 = requireWritableOrg(ctx.organizationId);
  if (readOnly1) return readOnly1;
  const { userId, organizationId } = ctx;

  let body: { password?: string; scope?: string };
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_BODY', 400);
  }
  // Anything but an explicit 'organization' is the personal request: the
  // narrower, never-destructive-to-others reading of an unclear body.
  const scope = body.scope === 'organization' ? 'organization' : 'account';

  // Role BEFORE password: an admin gets 403 whatever they type.
  if (scope === 'organization') {
    const denied = requireOwnerRole(ctx);
    if (denied) return denied;
  }

  const password = body.password || '';
  if (!password) return fail('MISSING_PASSWORD', 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail('NOT_FOUND', 404);

  // OAuth-only accounts have no password to confirm with. Refuse rather than
  // weaken the confirmation (see report: needs a re-auth flow of its own).
  if (!user.passwordHash) return fail('NO_PASSWORD_SET', 400);

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return fail('PASSWORD_INVALID', 403);

  if (scope === 'organization') return requestOrganizationDeletion(req, userId, organizationId);

  // Already requested: report the existing timestamp instead of resetting the
  // clock, so a double click cannot extend (or restart) the grace period.
  if (user.deletionRequestedAt) {
    return ok({
      requestedAt: user.deletionRequestedAt.toISOString(),
      organizationsAwaitingApproval: 0,
      alreadyRequested: true,
      graceDays: DELETION_GRACE_DAYS,
    });
  }

  const ownership = await soleOwnershipOf(userId);
  if (ownership.blocking.length > 0) return fail('SOLE_OWNER', 409);

  const requestedAt = new Date();
  const aloneIds = ownership.alone.map((o) => o.id);

  // Persist FIRST, Stripe after: recording the request is the legal obligation,
  // and a Stripe outage must not be able to swallow it.
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: requestedAt },
    });
    if (aloneIds.length > 0) {
      // Option b: companies this person is the only member of. A request
      // already waiting (they asked for it before) keeps its own date.
      await tx.organization.updateMany({
        where: { id: { in: aloneIds }, deletionApprovalRequestedAt: null, deletionRequestedAt: null },
        data: { deletionApprovalRequestedAt: requestedAt, deletionApprovalRequestedById: userId },
      });
    }
    // JWT sessions are stateless, but the adapter writes Session rows for OAuth
    // logins: drop this user's so no server-side session survives the request.
    await tx.session.deleteMany({ where: { userId } });
  });

  // Founder's addition to option b: the subscription must not keep charging
  // someone who asked to leave while the company's request waits for the
  // founder — set it to end at period end NOW, with the existing mechanism.
  let subscriptionsScheduledForCancellation = 0;
  for (const id of aloneIds) {
    if (await scheduleSubscriptionEnd(id)) subscriptionsScheduledForCancellation += 1;
  }

  // The two emails, only for requests filed by THIS call (not for one that was
  // already waiting: the founder and the requester already have those).
  const filed = aloneIds.length
    ? await prisma.organization.findMany({
        where: { id: { in: aloneIds }, deletionApprovalRequestedAt: requestedAt, deletionApprovalRequestedById: userId },
        select: { id: true },
      })
    : [];
  for (const org of filed) {
    await sendApprovalRequestEmails({
      kind: 'requested',
      organizationId: org.id,
      requesterId: userId,
      requestedAt,
      automatic: true,
    });
  }

  await auditLog({
    action: 'gdpr.account_deletion_request',
    userId,
    organizationId,
    req,
    metadata: {
      organizationIncluded: false,
      organizationsAwaitingApproval: filed.length,
      subscriptionsScheduledForCancellation,
    },
  });

  return ok({
    requestedAt: requestedAt.toISOString(),
    organizationsAwaitingApproval: filed.length,
    alreadyRequested: false,
    graceDays: DELETION_GRACE_DAYS,
  });
}

/**
 * The owner asks to delete the company. Only RECORDS the request as waiting —
 * no session is dropped, no account stamped, Stripe untouched, nothing
 * deleted — and sends the two emails (founder's inbox, owner).
 */
async function requestOrganizationDeletion(req: Request, userId: string, organizationId: string) {
  const requestedAt = new Date();
  // Conditional write: a request already waiting keeps its date (a double
  // click cannot restart the founder's month), and a deletion already
  // confirmed is not requested again.
  const claimed = await prisma.organization.updateMany({
    where: { id: organizationId, deletionApprovalRequestedAt: null, deletionRequestedAt: null },
    data: { deletionApprovalRequestedAt: requestedAt, deletionApprovalRequestedById: userId },
  });
  if (claimed.count === 0) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { deletionRequestedAt: true, deletionApprovalRequestedAt: true },
    });
    if (org?.deletionRequestedAt) return fail('ORGANIZATION_DELETION_ALREADY_CONFIRMED', 409);
    return ok({
      organizationApprovalRequestedAt: org?.deletionApprovalRequestedAt?.toISOString() ?? null,
      alreadyRequested: true,
    });
  }

  await sendApprovalRequestEmails({
    kind: 'requested',
    organizationId,
    requesterId: userId,
    requestedAt,
    automatic: false,
  });

  await auditLog({
    action: 'gdpr.org_deletion_approval_requested',
    userId,
    organizationId,
    targetType: 'organization',
    targetId: organizationId,
    req,
  });

  return ok({ organizationApprovalRequestedAt: requestedAt.toISOString(), alreadyRequested: false });
}

/**
 * Withdraws a request inside its window. NO PASSWORD REQUIRED, unlike POST —
 * deliberately: withdrawing is the SAFE direction, it undoes a destructive
 * request rather than making one. REFUSED server-side when there is nothing
 * to withdraw (NOTHING_TO_CANCEL), never a silent success; and past the 30
 * days (GRACE_EXPIRED) the request is definitive.
 *
 * `?scope=organization` — OWNER only: withdraws the company's request, waiting
 *   or already confirmed (founder's rule: after the confirmation only the
 *   owner can stop the 30 days; an admin no longer can).
 * no scope — the caller's own account (the cancel screen at
 *   /[locale]/deletion-pending, and Settings → Security). Also takes back what
 *   that same request started:
 *     – the company requests filed because they were its only member (option
 *       b), and the subscription end set at the same time;
 *     – a request made BEFORE this split, when an owner's/admin's one click
 *       stamped the account AND the company with the same instant: undone
 *       together, exactly as before.
 *
 * `allowDeletionPending` is what lets a person whose own deletion is pending
 * reach this route at all — every other route sees no user for them.
 */
export async function DELETE(req: Request) {
  const ctx = await getAuthContext({ allowDeletionPending: true });
  if (!ctx) return fail('UNAUTHORIZED', 401);
  // Demo organization: read-only. See requireWritableOrg.
  const readOnly = requireWritableOrg(ctx.organizationId);
  if (readOnly) return readOnly;
  const { userId, organizationId } = ctx;

  if (new URL(req.url).searchParams.get('scope') === 'organization') {
    const denied = requireOwnerRole(ctx);
    if (denied) return denied;
    return cancelOrganizationDeletion(req, userId, organizationId);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { deletionRequestedAt: true } });
  if (!user) return fail('NOT_FOUND', 404);
  const personalAt = user.deletionRequestedAt;
  if (!personalAt) return fail('NOTHING_TO_CANCEL', 400);
  if (isPastGrace(personalAt)) return fail('GRACE_EXPIRED', 410);

  const [ownership, legacy] = await Promise.all([
    soleOwnershipOf(userId),
    // Pre-split combined request: same instant on the company as on the
    // account, in a company this person belongs to — proof it was their click.
    prisma.organization.findMany({
      where: { deletionRequestedAt: personalAt, memberships: { some: { userId } } },
      select: { id: true },
    }),
  ]);
  const aloneIds = ownership.alone.map((o) => o.id);
  const legacyIds = legacy.map((o) => o.id);
  // The company requests this person filed and that go away with this
  // withdrawal — read first so the founder can be told which ones.
  const withdrawing = aloneIds.length
    ? await prisma.organization.findMany({
        where: { id: { in: aloneIds }, deletionApprovalRequestedById: userId, deletionApprovalRequestedAt: { not: null } },
        select: { id: true, deletionApprovalRequestedAt: true },
      })
    : [];

  let approvalsWithdrawn = 0;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { deletionRequestedAt: null } });
    if (withdrawing.length > 0) {
      approvalsWithdrawn = (
        await tx.organization.updateMany({
          where: { id: { in: withdrawing.map((o) => o.id) }, deletionApprovalRequestedById: userId, deletionApprovalRequestedAt: { not: null } },
          data: { deletionApprovalRequestedAt: null, deletionApprovalRequestedById: null },
        })
      ).count;
    }
    if (legacyIds.length > 0) {
      await tx.organization.updateMany({
        where: { id: { in: legacyIds }, deletionRequestedAt: personalAt },
        data: { deletionRequestedAt: null },
      });
    }
  });

  // DB first, Stripe after: an outage must not leave the deletion state stuck.
  let subscriptionsRestored = 0;
  for (const id of [...aloneIds, ...legacyIds]) {
    if (await unscheduleSubscriptionEnd(id)) subscriptionsRestored += 1;
  }
  for (const id of legacyIds) {
    await notifyDeletionCancelled(id, userId);
  }
  // The founder was told about these requests: tell them they are gone too.
  for (const org of withdrawing) {
    await sendApprovalRequestEmails({
      kind: 'withdrawn',
      organizationId: org.id,
      requesterId: userId,
      requestedAt: org.deletionApprovalRequestedAt as Date,
      automatic: true,
    });
  }

  await auditLog({
    action: 'gdpr.account_deletion_cancelled',
    userId,
    organizationId,
    req,
    metadata: {
      personalCancelled: true,
      organizationApprovalsWithdrawn: approvalsWithdrawn,
      organizationCancelled: legacyIds.length > 0,
      subscriptionsRestored,
    },
  });

  return ok({
    personalCancelled: true,
    organizationApprovalsWithdrawn: approvalsWithdrawn,
    organizationCancelled: legacyIds.length > 0,
    subscriptionRestored: subscriptionsRestored > 0,
  });
}

/**
 * The owner takes back the company's request: while it is still waiting for
 * the founder (nothing else to undo — nothing else was ever changed), or after
 * the confirmation, within the 30 days (subscription end undone with the GDPR
 * marker check, members told the company is safe).
 */
async function cancelOrganizationDeletion(req: Request, userId: string, organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      deletionRequestedAt: true,
      deletionApprovalRequestedAt: true,
      deletionApprovalRequestedById: true,
    },
  });
  if (!org) return fail('NOT_FOUND', 404);

  if (org.deletionApprovalRequestedAt) {
    const withdrawn = await prisma.organization.updateMany({
      where: { id: organizationId, deletionApprovalRequestedAt: { not: null } },
      data: { deletionApprovalRequestedAt: null, deletionApprovalRequestedById: null },
    });
    if (withdrawn.count === 0) return fail('NOTHING_TO_CANCEL', 400);
    await sendApprovalRequestEmails({
      kind: 'withdrawn',
      organizationId,
      requesterId: org.deletionApprovalRequestedById ?? userId,
      requestedAt: org.deletionApprovalRequestedAt,
      automatic: false,
    });
    await auditLog({
      action: 'gdpr.org_deletion_approval_withdrawn',
      userId,
      organizationId,
      targetType: 'organization',
      targetId: organizationId,
      req,
    });
    return ok({ organizationApprovalWithdrawn: true, organizationCancelled: false, subscriptionRestored: false });
  }

  if (!org.deletionRequestedAt) return fail('NOTHING_TO_CANCEL', 400);
  if (isPastGrace(org.deletionRequestedAt)) return fail('GRACE_EXPIRED', 410);

  await prisma.organization.update({ where: { id: organizationId }, data: { deletionRequestedAt: null } });
  const subscriptionRestored = await unscheduleSubscriptionEnd(organizationId);
  await notifyDeletionCancelled(organizationId, userId);

  await auditLog({
    action: 'gdpr.account_deletion_cancelled',
    userId,
    organizationId,
    req,
    metadata: { personalCancelled: false, organizationCancelled: true, subscriptionRestored },
  });

  return ok({ organizationApprovalWithdrawn: false, organizationCancelled: true, subscriptionRestored });
}
