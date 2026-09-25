import bcrypt from 'bcryptjs';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { isManagerRole } from '@/lib/auth/require-role';
import { getStripe } from '@/lib/stripe/client';
import {
  DELETION_GRACE_DAYS,
  daysRemainingInGrace,
  isPastGrace,
  GDPR_STRIPE_CANCELLATION_MARKER,
} from '@/lib/gdpr/constants';
import { auditLog } from '@/lib/audit/log';
import {
  sendEmail,
  sanitizeSubjectText,
  orgDeletionMemberNoticeTemplate,
  orgDeletionMemberCancelledTemplate,
} from '@/lib/email';
import { siteUrl } from '@/lib/auth/tokens';
import { formatDate } from '@/lib/utils';

/**
 * Every OTHER member of the organization — never the actor themselves, who
 * sees the request/cancellation live in the UI that called this route.
 * Shared between POST (deletion notice) and DELETE (cancellation notice):
 * same audience, same query, only the template differs.
 */
async function otherMembersOf(organizationId: string, excludeUserId: string) {
  return prisma.membership.findMany({
    where: { organizationId, userId: { not: excludeUserId } },
    select: { user: { select: { email: true, name: true, locale: true } } },
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GDPR art. 17 — right to erasure. POST here REQUESTS deletion; it never
 * deletes anything itself. It stamps `deletionRequestedAt` and the purge cron
 * (/api/cron/gdpr-purge) removes the rows for good after the grace period —
 * and DELETE below (added later) UNDOES that stamp within the same window, so
 * a mistaken or malicious click is recoverable, self-service where reachable,
 * by an operator always.
 *
 * SCOPE, per the founder's rule:
 *   • owner/admin → their account AND the organization (with all of its data).
 *   • any other member → their own account and membership only. The organization
 *     and every business record stay untouched: a plain member cannot delete the
 *     company.
 * Other members' personal accounts are NEVER deleted, not even when the whole
 * organization goes: they simply lose this workspace.
 *
 * CONFIRMATION: the current password is required and verified with bcrypt, the
 * same check as /api/auth/change-password. A stolen session alone is not enough
 * to destroy a company.
 */
/**
 * Scope preview for the confirmation dialog: tells the UI EXACTLY what a POST
 * would destroy, decided by the same server-side role check, so the warning text
 * can never disagree with what actually happens.
 *
 * Also reports two INDEPENDENT pending states, each with its own cancel button
 * in the UI (see DELETE below):
 *   • the caller's OWN account (`alreadyRequested`/`requestedAt`), exactly as
 *     before this addition;
 *   • `organizationPending`, NEW — the current organization's own request,
 *     visible to ANY manager (owner/admin) of it, not only the one who made it.
 *     This matters: only the requester's OWN User row is ever stamped (see the
 *     POST handler), so a co-owner who did not request anything has an
 *     unstamped `deletionRequestedAt` and would see `alreadyRequested: false`
 *     even while their COMPANY is counting down to deletion. Without this
 *     field, that co-owner has no way to even see it from here.
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return fail('UNAUTHORIZED', 401);
  const isManager = isManagerRole(ctx.role);

  const [user, organization] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { deletionRequestedAt: true, passwordHash: true },
    }),
    // Only a manager can act on the organization's request (same boundary the
    // POST handler already enforces for CREATING one), so this is skipped
    // entirely for anyone else — a plain member never learns the organization's
    // deletion state through this endpoint.
    isManager
      ? prisma.organization.findUnique({
          where: { id: ctx.organizationId },
          select: { deletionRequestedAt: true },
        })
      : Promise.resolve(null),
  ]);
  if (!user) return fail('NOT_FOUND', 404);

  return ok({
    organizationIncluded: isManager,
    graceDays: DELETION_GRACE_DAYS,
    alreadyRequested: !!user.deletionRequestedAt,
    requestedAt: user.deletionRequestedAt?.toISOString() ?? null,
    daysRemaining: user.deletionRequestedAt
      ? daysRemainingInGrace(user.deletionRequestedAt)
      : null,
    canConfirmWithPassword: !!user.passwordHash,
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
  const { userId, organizationId, role } = ctx;

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_BODY', 400);
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

  // Already requested: report the existing timestamp instead of resetting the
  // clock, so a double click cannot extend (or restart) the grace period.
  if (user.deletionRequestedAt) {
    return ok({
      requestedAt: user.deletionRequestedAt.toISOString(),
      organizationIncluded: false,
      subscriptionScheduledForCancellation: false,
      alreadyRequested: true,
      graceDays: DELETION_GRACE_DAYS,
    });
  }

  const deletesOrganization = isManagerRole(role);
  const requestedAt = new Date();

  // Persist FIRST, Stripe after: recording the request is the legal obligation,
  // and a Stripe outage must not be able to swallow it. The reverse order could
  // cancel a paying customer's subscription without registering the deletion.
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: requestedAt },
    });
    if (deletesOrganization) {
      await tx.organization.update({
        where: { id: organizationId },
        data: { deletionRequestedAt: requestedAt },
      });
    }
    // JWT sessions are stateless, but the adapter writes Session rows for OAuth
    // logins: drop this user's so no server-side session survives the request.
    await tx.session.deleteMany({ where: { userId } });
  });

  // Schedule the subscription to end at period end, but only when the
  // organization itself is going away. A member leaving must never touch the
  // company's subscription.
  //
  // NOT an immediate cancel.cancel() any more (founder's decision): whoever
  // paid for the current period keeps using the service until it runs out,
  // no refund either way — the same rule the pricing FAQ already states for
  // an ordinary plan cancellation ("L'abbonamento resta attivo fino alla
  // fine del periodo di fatturazione corrente"). An immediate hard cancel
  // also could not be undone if the request is itself cancelled within the
  // 30 days: the owner would have to re-subscribe for a period they had
  // already paid for.
  //
  // Skipped when the subscription is ALREADY scheduled to cancel
  // (`cancelAtPeriodEnd`, mirrored from Stripe by the webhook): it may be
  // scheduled for a reason that has nothing to do with this request — the
  // owner cancelled through the Stripe customer portal on their own, before
  // ever asking to delete the account. Calling update() again would stamp
  // the GDPR marker (below) over that independent decision, and the
  // un-schedule on DELETE would then wrongly reactivate it. Nothing to
  // schedule here either way: it is already going to end.
  let subscriptionScheduledForCancellation = false;
  if (deletesOrganization) {
    try {
      const billing = await prisma.billingSubscription.findUnique({
        where: { organizationId },
        select: { stripeSubscriptionId: true, status: true, cancelAtPeriodEnd: true },
      });
      if (billing?.stripeSubscriptionId && billing.status !== 'canceled' && !billing.cancelAtPeriodEnd) {
        // The comment marks THIS as the origin of the schedule — read back by
        // DELETE below before ever undoing it. See GDPR_STRIPE_CANCELLATION_MARKER.
        await getStripe().subscriptions.update(billing.stripeSubscriptionId, {
          cancel_at_period_end: true,
          cancellation_details: { comment: GDPR_STRIPE_CANCELLATION_MARKER },
        });
        subscriptionScheduledForCancellation = true;
      }
    } catch (e) {
      // Deliberately non-fatal: the deletion request stands. Logged loudly so an
      // operator can schedule the cancellation by hand in the Stripe dashboard.
      console.error(
        `[gdpr/account] Stripe cancel_at_period_end FAILED for organization ${organizationId} — schedule it manually:`,
        e,
      );
    }
  }

  // Every OTHER member learns the company is going away — without this they
  // find out only when they are locked out on day 30, with no chance to
  // export anything first. Sent AFTER the transaction (never inside it: this
  // is a network call, and email delivery failing must never roll back the
  // request itself) and only for a request that actually includes the
  // organization — a member leaving on their own never triggers this.
  if (deletesOrganization) {
    const purgeAt = new Date(requestedAt.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const orgName = org?.name ?? '';
    const recipients = await otherMembersOf(organizationId, userId);
    for (const m of recipients) {
      if (!m.user?.email) continue;
      const recipientLocale = m.user.locale === 'en' ? 'en' : 'it';
      const deletionDate = formatDate(purgeAt, recipientLocale);
      const sendResult = await sendEmail({
        to: m.user.email,
        subject: recipientLocale === 'en'
          ? `${sanitizeSubjectText(orgName)} is scheduled for deletion · Anlyra`
          : `${sanitizeSubjectText(orgName)} sarà cancellata · Anlyra`,
        html: orgDeletionMemberNoticeTemplate({
          userName: m.user.name || m.user.email,
          userEmail: m.user.email,
          orgName,
          deletionDate,
          exportUrl: `${siteUrl()}/${recipientLocale}/settings/security`,
          locale: recipientLocale,
        }),
      });
      if (!sendResult.success) {
        console.error('[email] org-deletion-member-notice failed', {
          to: m.user.email,
          reason: sendResult.error,
        });
      }
    }
  }

  await auditLog({
    action: 'gdpr.account_deletion_request',
    userId,
    organizationId,
    req,
    metadata: { organizationIncluded: deletesOrganization, subscriptionScheduledForCancellation },
  });

  return ok({
    requestedAt: requestedAt.toISOString(),
    organizationIncluded: deletesOrganization,
    subscriptionScheduledForCancellation,
    alreadyRequested: false,
    graceDays: DELETION_GRACE_DAYS,
  });
}

/**
 * Cancels a deletion request inside the 30-day grace period — the only way to
 * do so today short of the founder's local admin panel (admin/actions.ts,
 * unblockAccount): VERIFIED before writing this by searching every write to
 * `deletionRequestedAt` in the codebase — the admin panel was the only place
 * that ever set it back to null.
 *
 * NO PASSWORD REQUIRED, unlike POST above — deliberately. Cancelling is the
 * SAFE direction: it undoes a destructive action rather than causing one, the
 * same asymmetry the report-sharing routes already use (creating a public
 * share link requires nothing extra beyond the role check either; only the
 * destructive step, in this file the deletion REQUEST, is behind a password).
 * A session that reached this handler is already authenticated.
 *
 * TWO INDEPENDENT CANCELLATIONS, exactly mirroring how the POST above decides
 * what to stamp:
 *   • the caller's own account, if `deletionRequestedAt` is set on it;
 *   • the organization's, if `deletionRequestedAt` is set on it AND the caller
 *     is currently owner/admin — the same boundary POST uses to decide whether
 *     to stamp the organization in the first place. This is NOT restricted to
 *     "only the person who originally requested it": any manager already has
 *     the authority to REQUEST the company's deletion, so any manager also has
 *     the authority to cancel a pending one, whoever made it.
 * Neither depends on the other: a manager whose own account is not pending can
 * still cancel a company-wide request (see GET's `organizationPending`), and a
 * plain member can still cancel their own personal request without touching
 * the organization at all.
 *
 * REFUSED, server-side, when there is nothing to cancel — never just hidden by
 * the UI: a request with nothing pending for this caller gets NOTHING_TO_CANCEL
 * rather than a silent no-op success.
 *
 * THE ONE ROUTE A PENDING ACCOUNT MAY CALL: `allowDeletionPending` below is
 * what lets the owner who requested deletion sign back in and cancel from the
 * cancellation screen (app/[locale]/deletion-pending) — every other route sees
 * no user for them. And only within the 30 days: a request past the grace
 * period is definitive (isPastGrace, the purge's own test) and is refused with
 * GRACE_EXPIRED rather than undone the night before the purge would run.
 *
 * SUBSCRIPTION: when `cancelOrganization` is true, this also un-schedules the
 * `cancel_at_period_end` that POST may have set — but ONLY if the marker on
 * the Stripe subscription (GDPR_STRIPE_CANCELLATION_MARKER) shows THIS
 * request set it. If the owner had already scheduled their own cancellation
 * through the Stripe customer portal before ever requesting deletion, that
 * schedule is left exactly as it was: cancelling a deletion request must
 * never reactivate a subscription the owner separately chose to end.
 */
export async function DELETE(req: Request) {
  const ctx = await getAuthContext({ allowDeletionPending: true });
  if (!ctx) return fail('UNAUTHORIZED', 401);
  // Demo organization: read-only. See requireWritableOrg. (The demo org can
  // never actually reach this state, but every write path here uses the same
  // guard as POST for the same reason POST does.)
  const readOnly = requireWritableOrg(ctx.organizationId);
  if (readOnly) return readOnly;
  const { userId, organizationId, role } = ctx;
  const isManager = isManagerRole(role);

  const [user, organization] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { deletionRequestedAt: true } }),
    isManager
      ? prisma.organization.findUnique({ where: { id: organizationId }, select: { deletionRequestedAt: true } })
      : Promise.resolve(null),
  ]);
  if (!user) return fail('NOT_FOUND', 404);

  const personalAt = user.deletionRequestedAt;
  const organizationAt = isManager ? (organization?.deletionRequestedAt ?? null) : null;
  const cancelPersonal = !!personalAt && !isPastGrace(personalAt);
  const cancelOrganization = !!organizationAt && !isPastGrace(organizationAt);

  if (!cancelPersonal && !cancelOrganization) {
    return personalAt || organizationAt
      ? fail('GRACE_EXPIRED', 410)
      : fail('NOTHING_TO_CANCEL', 400);
  }

  await prisma.$transaction(async (tx) => {
    if (cancelPersonal) {
      await tx.user.update({ where: { id: userId }, data: { deletionRequestedAt: null } });
    }
    if (cancelOrganization) {
      await tx.organization.update({ where: { id: organizationId }, data: { deletionRequestedAt: null } });
    }
  });

  // Un-schedule the subscription's end, but only when the ORGANIZATION's
  // request is the one being cancelled (a member cancelling their own
  // personal request never touched Stripe in the first place — see POST's
  // `deletesOrganization` gate) and only when GDPR is what scheduled it.
  // DB dates are already cleared above regardless of what happens here: a
  // Stripe outage must not be able to leave the deletion state stuck.
  let subscriptionRestored = false;
  if (cancelOrganization) {
    try {
      const billing = await prisma.billingSubscription.findUnique({
        where: { organizationId },
        select: { stripeSubscriptionId: true, status: true, cancelAtPeriodEnd: true },
      });
      if (billing?.stripeSubscriptionId && billing.status !== 'canceled' && billing.cancelAtPeriodEnd) {
        // Read the LIVE object: cancellation_details is Stripe-side state, not
        // mirrored into BillingSubscription by the webhook (only
        // cancel_at_period_end itself is).
        const stripe = getStripe();
        const live = await stripe.subscriptions.retrieve(billing.stripeSubscriptionId);
        if (
          live.cancel_at_period_end &&
          live.cancellation_details?.comment === GDPR_STRIPE_CANCELLATION_MARKER
        ) {
          await stripe.subscriptions.update(billing.stripeSubscriptionId, {
            cancel_at_period_end: false,
            cancellation_details: { comment: null },
          });
          subscriptionRestored = true;
        }
        // Else: scheduled for a reason that predates or is unrelated to this
        // request (e.g. the owner's own cancellation via the Stripe customer
        // portal) — left untouched on purpose, see the doc comment above.
      }
    } catch (e) {
      // Deliberately non-fatal, same reasoning as POST: logged loudly so an
      // operator can un-schedule it by hand in the Stripe dashboard.
      console.error(
        `[gdpr/account] Stripe un-schedule FAILED for organization ${organizationId} — restore it manually:`,
        e,
      );
    }
  }

  // Same audience as the notice POST sent, told the alarm is lifted — see
  // orgDeletionMemberCancelledTemplate for why this one exists at all: the
  // banner already disappears for anyone who opens the app again, but email
  // was the channel that reached members who do not, and leaving them with a
  // stale "your company will be deleted" is worse than one more email.
  if (cancelOrganization) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const orgName = org?.name ?? '';
    const recipients = await otherMembersOf(organizationId, userId);
    for (const m of recipients) {
      if (!m.user?.email) continue;
      const recipientLocale = m.user.locale === 'en' ? 'en' : 'it';
      const sendResult = await sendEmail({
        to: m.user.email,
        subject: recipientLocale === 'en'
          ? `${sanitizeSubjectText(orgName)} is safe — deletion cancelled · Anlyra`
          : `${sanitizeSubjectText(orgName)} è al sicuro — cancellazione annullata · Anlyra`,
        html: orgDeletionMemberCancelledTemplate({
          userName: m.user.name || m.user.email,
          userEmail: m.user.email,
          orgName,
          locale: recipientLocale,
        }),
      });
      if (!sendResult.success) {
        console.error('[email] org-deletion-member-cancelled failed', {
          to: m.user.email,
          reason: sendResult.error,
        });
      }
    }
  }

  await auditLog({
    action: 'gdpr.account_deletion_cancelled',
    userId,
    organizationId,
    req,
    metadata: { personalCancelled: cancelPersonal, organizationCancelled: cancelOrganization, subscriptionRestored },
  });

  return ok({ personalCancelled: cancelPersonal, organizationCancelled: cancelOrganization, subscriptionRestored });
}
