import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe/client';
import { COMPANY } from '@/lib/company';
import { siteUrl } from '@/lib/auth/tokens';
import { formatDate } from '@/lib/utils';
import {
  sendEmail,
  sanitizeSubjectText,
  orgDeletionMemberNoticeTemplate,
  orgDeletionMemberCancelledTemplate,
  orgDeletionApprovalFounderTemplate,
  orgDeletionApprovalReceivedTemplate,
  orgDeletionApprovalRejectedTemplate,
} from '@/lib/email';
import { DELETION_GRACE_DAYS, GDPR_STRIPE_CANCELLATION_MARKER } from './constants';

/**
 * Company deletion, founder's rules (2026-09-27):
 *   • only the OWNER may ask to delete the company, and the request only WAITS
 *     (Organization.deletionApprovalRequestedAt) — nothing is deleted or
 *     blocked until the founder confirms it from the local admin panel;
 *   • the confirmation starts the process that already existed: the 30 days
 *     (Organization.deletionRequestedAt, read by the purge cron), a notice to
 *     the members, the subscription set to end at period end;
 *   • deleting one's OWN account never waits for anyone (GDPR right). The one
 *     case where it touches a company is when that person is its only member:
 *     see soleOwnershipOf below.
 *
 * Shared by the product (src/app/api/gdpr/account/route.ts) and the admin
 * panel (admin/actions.ts) so the two can never run two different versions of
 * "the process". The Stripe and email code below was moved here unchanged from
 * that route, which is where it lived before this split.
 */

/**
 * Where the calling person's own account deletion would leave a company.
 *   • `blocking` — companies where they are the ONLY owner while other people
 *     are still members. Deleting the account would leave those people in a
 *     company nobody can manage: billing is owner-only, and only an owner can
 *     name another owner. Personal deletion is refused until they name another
 *     owner or ask for the company's deletion (founder's decision, option a).
 *   • `alone` — companies where they are the ONLY member, whatever their role.
 *     Handing ownership to someone is impossible there, so personal deletion
 *     goes ahead and a request to delete the company is filed for the
 *     founder's confirmation (option b).
 * A company whose deletion is already confirmed is in neither list: it is
 * going away anyway, on its own schedule.
 */
export async function soleOwnershipOf(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          deletionRequestedAt: true,
          memberships: { where: { userId: { not: userId } }, select: { role: true } },
        },
      },
    },
  });

  const blocking: { id: string; name: string }[] = [];
  const alone: { id: string; name: string }[] = [];
  for (const m of memberships) {
    const org = m.organization;
    if (org.deletionRequestedAt) continue;
    const others = org.memberships;
    if (others.length === 0) {
      alone.push({ id: org.id, name: org.name });
    } else if (m.role === 'owner' && !others.some((o) => o.role === 'owner')) {
      blocking.push({ id: org.id, name: org.name });
    }
  }
  return { blocking, alone };
}

/**
 * Schedules the organization's subscription to end at period end — the same
 * cancel_at_period_end + GDPR marker the account route has always used.
 * Returns whether it scheduled anything.
 *
 * NOT an immediate cancel (founder's decision): whoever paid for the current
 * period keeps it until it runs out, no refund either way, and an immediate
 * cancel could not be undone if the request itself is withdrawn.
 *
 * Skipped when the subscription is ALREADY scheduled to cancel
 * (`cancelAtPeriodEnd`, mirrored from Stripe by the webhook): it may be for a
 * reason unrelated to this request (the owner cancelled through the Stripe
 * portal). Stamping the GDPR marker over that would make the un-schedule
 * below wrongly reactivate it.
 *
 * Non-fatal: the request stands even if Stripe is down. Logged loudly so an
 * operator can schedule it by hand in the Stripe dashboard.
 */
export async function scheduleSubscriptionEnd(organizationId: string): Promise<boolean> {
  try {
    const billing = await prisma.billingSubscription.findUnique({
      where: { organizationId },
      select: { stripeSubscriptionId: true, status: true, cancelAtPeriodEnd: true },
    });
    if (billing?.stripeSubscriptionId && billing.status !== 'canceled' && !billing.cancelAtPeriodEnd) {
      // The comment marks THIS as the origin of the schedule — read back by
      // unscheduleSubscriptionEnd before ever undoing it.
      await getStripe().subscriptions.update(billing.stripeSubscriptionId, {
        cancel_at_period_end: true,
        cancellation_details: { comment: GDPR_STRIPE_CANCELLATION_MARKER },
      });
      return true;
    }
  } catch (e) {
    console.error(
      `[gdpr] Stripe cancel_at_period_end FAILED for organization ${organizationId} — schedule it manually:`,
      e,
    );
  }
  return false;
}

/**
 * Undoes scheduleSubscriptionEnd — but ONLY if the marker on the live Stripe
 * subscription shows a GDPR request set it. A schedule the owner made on their
 * own (Stripe customer portal) is left exactly as it was: withdrawing a
 * deletion request must never reactivate a subscription someone separately
 * chose to end. Non-fatal, same reasoning as above.
 */
export async function unscheduleSubscriptionEnd(organizationId: string): Promise<boolean> {
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
      if (live.cancel_at_period_end && live.cancellation_details?.comment === GDPR_STRIPE_CANCELLATION_MARKER) {
        await stripe.subscriptions.update(billing.stripeSubscriptionId, {
          cancel_at_period_end: false,
          cancellation_details: { comment: null },
        });
        return true;
      }
    }
  } catch (e) {
    console.error(
      `[gdpr] Stripe un-schedule FAILED for organization ${organizationId} — restore it manually:`,
      e,
    );
  }
  return false;
}

/**
 * Members who should hear about the company's fate: everyone except
 * `excludeUserId` (the person acting, who sees the result on screen) and
 * except anyone whose OWN account deletion is pending — they are locked out of
 * the app, so "you can still use it and export the data" would not be true
 * for them, and they already chose to leave.
 */
async function membersToNotify(organizationId: string, excludeUserId: string | null) {
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      user: { deletionRequestedAt: null },
    },
    select: { user: { select: { email: true, name: true, locale: true } } },
  });
  return memberships.map((m) => m.user).filter((u) => !!u?.email);
}

/**
 * The notice every member gets when the deletion is CONFIRMED: the date, and
 * a link to export the data first. Sent after the DB write, never inside a
 * transaction: email failing must never undo the confirmation.
 */
async function notifyDeletionScheduled(organizationId: string, orgName: string, startedAt: Date) {
  const purgeAt = new Date(startedAt.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
  let sent = 0;
  for (const user of await membersToNotify(organizationId, null)) {
    const locale = user.locale === 'en' ? 'en' : 'it';
    const result = await sendEmail({
      to: user.email,
      subject: locale === 'en'
        ? `${sanitizeSubjectText(orgName)} is scheduled for deletion · Anlyra`
        : `${sanitizeSubjectText(orgName)} sarà cancellata · Anlyra`,
      html: orgDeletionMemberNoticeTemplate({
        userName: user.name || user.email,
        userEmail: user.email,
        orgName,
        deletionDate: formatDate(purgeAt, locale),
        exportUrl: `${siteUrl()}/${locale}/settings/security`,
        locale,
      }),
    });
    if (result.success) sent += 1;
    else console.error('[email] org-deletion-member-notice failed', { to: user.email, reason: result.error });
  }
  return sent;
}

/** The "it's safe after all" email, to the same audience as the notice above. */
export async function notifyDeletionCancelled(organizationId: string, excludeUserId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
  const orgName = org?.name ?? '';
  for (const user of await membersToNotify(organizationId, excludeUserId)) {
    const locale = user.locale === 'en' ? 'en' : 'it';
    const result = await sendEmail({
      to: user.email,
      subject: locale === 'en'
        ? `${sanitizeSubjectText(orgName)} is safe — deletion cancelled · Anlyra`
        : `${sanitizeSubjectText(orgName)} è al sicuro — cancellazione annullata · Anlyra`,
      html: orgDeletionMemberCancelledTemplate({
        userName: user.name || user.email,
        userEmail: user.email,
        orgName,
        locale,
      }),
    });
    if (!result.success) {
      console.error('[email] org-deletion-member-cancelled failed', { to: user.email, reason: result.error });
    }
  }
}

/** Plain-text subscription summary for the founder's email. */
async function describeSubscription(organizationId: string): Promise<string> {
  const sub = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: { plan: true, status: true, cancelAtPeriodEnd: true },
  });
  if (!sub) return 'nessun abbonamento (prova o mai attivato)';
  return `${sub.plan}, ${sub.status}${sub.cancelAtPeriodEnd ? ', si chiude a fine periodo' : ''}`;
}

/**
 * The two emails of a new waiting request (founder's rule): one to the
 * founder's inbox with the details, one to the requester saying it arrived and
 * that they will be contacted. Or, for kind 'withdrawn', only the founder's —
 * the requester withdrew it themselves and sees that on screen.
 */
export async function sendApprovalRequestEmails(params: {
  kind: 'requested' | 'withdrawn';
  organizationId: string;
  requesterId: string;
  requestedAt: Date;
  automatic: boolean;
}) {
  const [org, requester, memberCount, subscription] = await Promise.all([
    prisma.organization.findUnique({ where: { id: params.organizationId }, select: { name: true } }),
    prisma.user.findUnique({
      where: { id: params.requesterId },
      select: { email: true, name: true, locale: true },
    }),
    prisma.membership.count({ where: { organizationId: params.organizationId } }),
    describeSubscription(params.organizationId),
  ]);
  const orgName = org?.name ?? '';
  const requesterEmail = requester?.email ?? '';
  const requesterName = requester?.name || requesterEmail;

  const founder = await sendEmail({
    to: COMPANY.contactEmail,
    replyTo: requesterEmail || undefined,
    subject: params.kind === 'withdrawn'
      ? `Richiesta ritirata: cancellazione di ${sanitizeSubjectText(orgName)}`
      : `Da confermare: cancellazione di ${sanitizeSubjectText(orgName)}`,
    html: orgDeletionApprovalFounderTemplate({
      kind: params.kind,
      orgName,
      orgId: params.organizationId,
      requesterName,
      requesterEmail,
      requestedAt: formatDate(params.requestedAt, 'it'),
      memberCount,
      subscription,
      automatic: params.automatic,
      inbox: COMPANY.contactEmail,
    }),
  });
  if (!founder.success) {
    console.error('[email] org-deletion-approval-founder failed', { organizationId: params.organizationId, reason: founder.error });
  }

  if (params.kind === 'withdrawn' || !requesterEmail) return;
  const locale = requester?.locale === 'en' ? 'en' : 'it';
  const owner = await sendEmail({
    to: requesterEmail,
    subject: locale === 'en'
      ? `Request to delete ${sanitizeSubjectText(orgName)} received · Anlyra`
      : `Richiesta di cancellazione di ${sanitizeSubjectText(orgName)} ricevuta · Anlyra`,
    html: orgDeletionApprovalReceivedTemplate({
      userName: requesterName,
      userEmail: requesterEmail,
      orgName,
      automatic: params.automatic,
      locale,
    }),
  });
  if (!owner.success) {
    console.error('[email] org-deletion-approval-received failed', { to: requesterEmail, reason: owner.error });
  }
}

/**
 * FOUNDER CONFIRMS (admin panel). Turns the waiting request into the process
 * that already existed: stamps deletionRequestedAt (the purge cron counts 30
 * days from it), schedules the subscription to end at period end, notifies the
 * members.
 *
 * The write is conditional on a request actually waiting, so a double click
 * or a request withdrawn meanwhile cannot restart or invent a countdown.
 */
export async function confirmOrganizationDeletion(organizationId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true, deletionApprovalRequestedAt: true, deletionApprovalRequestedById: true },
  });
  const startedAt = new Date();
  const claimed = await prisma.organization.updateMany({
    where: { id: organizationId, deletionApprovalRequestedAt: { not: null }, deletionRequestedAt: null },
    data: { deletionRequestedAt: startedAt, deletionApprovalRequestedAt: null, deletionApprovalRequestedById: null },
  });
  if (claimed.count === 0) {
    throw new Error(`Nessuna richiesta in attesa per ${org.name}: forse è già stata confermata, rifiutata o ritirata.`);
  }

  const subscriptionScheduledForCancellation = await scheduleSubscriptionEnd(organizationId);
  const membersNotified = await notifyDeletionScheduled(organizationId, org.name, startedAt);

  return {
    organizationName: org.name,
    requestedAt: org.deletionApprovalRequestedAt,
    requesterId: org.deletionApprovalRequestedById,
    startedAt,
    subscriptionScheduledForCancellation,
    membersNotified,
  };
}

/**
 * FOUNDER REJECTS (admin panel). Clears the waiting request — nothing else was
 * ever changed while it waited — and tells the requester. The subscription is
 * NOT touched: if it was set to end (only when the company's sole member is
 * deleting their own account), that person still asked to leave.
 */
export async function rejectOrganizationDeletion(organizationId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true, deletionApprovalRequestedAt: true, deletionApprovalRequestedById: true },
  });
  const cleared = await prisma.organization.updateMany({
    where: { id: organizationId, deletionApprovalRequestedAt: { not: null } },
    data: { deletionApprovalRequestedAt: null, deletionApprovalRequestedById: null },
  });
  if (cleared.count === 0) {
    throw new Error(`Nessuna richiesta in attesa per ${org.name}: forse è già stata confermata, rifiutata o ritirata.`);
  }

  let requesterNotified = false;
  const requester = org.deletionApprovalRequestedById
    ? await prisma.user.findUnique({
        where: { id: org.deletionApprovalRequestedById },
        select: { email: true, name: true, locale: true },
      })
    : null;
  if (requester?.email) {
    const locale = requester.locale === 'en' ? 'en' : 'it';
    const result = await sendEmail({
      to: requester.email,
      subject: locale === 'en'
        ? `Request to delete ${sanitizeSubjectText(org.name)} not confirmed · Anlyra`
        : `Richiesta di cancellazione di ${sanitizeSubjectText(org.name)} non confermata · Anlyra`,
      html: orgDeletionApprovalRejectedTemplate({
        userName: requester.name || requester.email,
        userEmail: requester.email,
        orgName: org.name,
        contactEmail: COMPANY.contactEmail,
        locale,
      }),
    });
    requesterNotified = result.success;
    if (!result.success) {
      console.error('[email] org-deletion-approval-rejected failed', { to: requester.email, reason: result.error });
    }
  }

  return {
    organizationName: org.name,
    requestedAt: org.deletionApprovalRequestedAt,
    requesterId: org.deletionApprovalRequestedById,
    requesterNotified,
  };
}
