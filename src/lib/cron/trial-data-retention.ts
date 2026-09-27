import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe/client';
import { DEMO_ORG_ID } from '@/lib/session';
import { purgeOrganization } from '@/lib/gdpr/purge';
import { sendEmail, sanitizeSubjectText, trialDataDeletionNoticeTemplate } from '@/lib/email';
import { siteUrl } from '@/lib/auth/tokens';
import { formatDate } from '@/lib/utils';
import { auditLog } from '@/lib/audit/log';

/**
 * Data of trials that never became a subscription is not kept forever
 * (founder's rule, 2026-09-27): it is deleted 12 months after the trial ended,
 * with an email to the owners and admins at least 30 days before.
 *
 *   • runTrialDataNotices — from /api/cron/trial-check (the email cron): sends
 *     the notice once, and records it (Organization.trialDataDeletionNoticeSentAt).
 *   • runTrialDataPurge — from /api/cron/gdpr-purge (the deletion cron): deletes
 *     with the SAME organization purge the GDPR flow uses (purgeOrganization),
 *     so members' personal accounts stay, exactly as in a normal deletion.
 *
 * NEVER WITHOUT THE NOTICE: an organization is deleted only if its notice went
 * out, and only on the LATER of "trial end + 12 months" and "notice + 30 days".
 * A missed cron day or a failed email delays the deletion; it never shortens
 * the 30 days.
 *
 * NEVER A CUSTOMER: see paymentHistory — any single trace of money protects the
 * organization, for good. The demo organization is excluded by its fixed id
 * (DEMO_ORG_ID), never by name: a name is whatever the customer typed.
 */

export const TRIAL_DATA_RETENTION_MONTHS = 12;
export const TRIAL_DATA_NOTICE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** BillingSubscription statuses that only a real Stripe subscription produces. */
const PAID_STATUSES = ['active', 'past_due'];

/** Trial end + 12 calendar months (same month arithmetic as the audit-log retention). */
export function retentionEndOf(trialEndsAt: Date): Date {
  const d = new Date(trialEndsAt.getTime());
  d.setUTCMonth(d.getUTCMonth() + TRIAL_DATA_RETENTION_MONTHS);
  return d;
}

/** The deletion date: the LATER of trial end + 12 months and notice + 30 days. */
export function trialDataDeletionDate(trialEndsAt: Date, noticeSentAt: Date): Date {
  return new Date(
    Math.max(retentionEndOf(trialEndsAt).getTime(), noticeSentAt.getTime() + TRIAL_DATA_NOTICE_DAYS * DAY_MS),
  );
}

/**
 * Organizations whose trial ended long enough ago to be within 30 days of the
 * 12 months (or past them). Never the demo organization, and never one whose
 * deletion is already confirmed — that one goes away on its own schedule.
 * `trialEndsAt` set is itself the first condition of "never paid": the Stripe
 * webhook clears it when a subscription becomes active, and so does the
 * founder assigning a plan from the admin panel.
 */
async function findCandidates(now: Date) {
  const cutoff = new Date(now.getTime() + TRIAL_DATA_NOTICE_DAYS * DAY_MS);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - TRIAL_DATA_RETENTION_MONTHS);
  const rows = await prisma.organization.findMany({
    where: {
      id: { not: DEMO_ORG_ID },
      trialEndsAt: { not: null, lte: cutoff },
      deletionRequestedAt: null,
    },
    select: { id: true, name: true, trialEndsAt: true, trialDataDeletionNoticeSentAt: true },
  });
  return rows.filter(
    (o): o is typeof o & { trialEndsAt: Date } =>
      !!o.trialEndsAt &&
      retentionEndOf(o.trialEndsAt).getTime() - TRIAL_DATA_NOTICE_DAYS * DAY_MS <= now.getTime(),
  );
}

/**
 * Has this organization EVER paid? 'never_paid' only when EVERY condition
 * holds; any single trace of money answers 'paid', for good — even if the
 * subscription is cancelled today:
 *   1. the trial end date is still set (cleared by a successful checkout and by
 *      a plan assigned from the admin panel);
 *   2. no invoice was ever recorded (Stripe invoice.paid webhook);
 *   3. no credit pack was ever bought (ledger row or purchased balance — a
 *      trial CAN buy packs, and that does not clear the trial end date);
 *   4. the subscription row, if any, has no Stripe subscription, is neither
 *      active nor past due, and is still on the default plan;
 *   5. if the row has a Stripe customer (the checkout page was opened), Stripe
 *      itself reports no successful charge for it. When Stripe cannot be
 *      asked, the answer is 'unknown' and the organization is left alone that
 *      day.
 * The row alone cannot tell: opening the checkout page and leaving creates one,
 * and a customer who paid and then cancelled ends up with an almost identical
 * one.
 */
async function paymentHistory(organizationId: string): Promise<'never_paid' | 'paid' | 'unknown'> {
  if (organizationId === DEMO_ORG_ID) return 'paid';
  const [org, sub, invoices, purchases] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { trialEndsAt: true, aiCreditsPurchased: true },
    }),
    prisma.billingSubscription.findUnique({
      where: { organizationId },
      select: { status: true, plan: true, stripeSubscriptionId: true, stripeCustomerId: true },
    }),
    prisma.billingInvoice.count({ where: { organizationId } }),
    prisma.creditEntry.count({ where: { organizationId, reason: 'purchase' } }),
  ]);
  if (!org?.trialEndsAt) return 'paid';
  if (invoices > 0 || purchases > 0 || org.aiCreditsPurchased > 0) return 'paid';
  if (sub) {
    if (sub.stripeSubscriptionId || PAID_STATUSES.includes(sub.status) || sub.plan !== 'PRO') return 'paid';
    if (sub.stripeCustomerId) {
      try {
        const charges = await getStripe().charges.list({ customer: sub.stripeCustomerId, limit: 100 });
        if (charges.has_more || charges.data.some((c) => c.paid || c.status === 'succeeded')) return 'paid';
      } catch (e) {
        console.error(`[trial-data] Stripe charges lookup failed for organization ${organizationId} — left alone today:`, e);
        return 'unknown';
      }
    }
  }
  return 'never_paid';
}

export interface TrialDataNoticeResult {
  /** Candidates without a notice yet. */
  considered: number;
  noticesSent: number;
  /** Protected: a trace of payment was found. */
  skippedPaid: number;
  /** Stripe could not be asked — retried on the next run. */
  skippedPaymentUnknown: number;
  /** No owner or admin to write to: no notice, therefore no deletion. */
  skippedNoRecipients: number;
  /** Every email failed — no notice recorded, retried on the next run. */
  failed: number;
}

export async function runTrialDataNotices(now: Date = new Date()): Promise<TrialDataNoticeResult> {
  const result: TrialDataNoticeResult = {
    considered: 0,
    noticesSent: 0,
    skippedPaid: 0,
    skippedPaymentUnknown: 0,
    skippedNoRecipients: 0,
    failed: 0,
  };
  const candidates = (await findCandidates(now)).filter((o) => !o.trialDataDeletionNoticeSentAt);
  result.considered = candidates.length;

  for (const org of candidates) {
    try {
      const history = await paymentHistory(org.id);
      if (history === 'paid') {
        result.skippedPaid++;
        continue;
      }
      if (history === 'unknown') {
        result.skippedPaymentUnknown++;
        continue;
      }

      const recipients = await prisma.membership.findMany({
        where: { organizationId: org.id, role: { in: ['owner', 'admin'] } },
        select: { user: { select: { email: true, name: true, locale: true } } },
      });
      if (recipients.length === 0) {
        result.skippedNoRecipients++;
        continue;
      }

      // The date this notice promises — the same formula the purge uses, with
      // this moment as the notice time.
      const deletionDate = trialDataDeletionDate(org.trialEndsAt, now);
      let anySent = false;
      for (const { user } of recipients) {
        if (!user?.email) continue;
        const locale = user.locale === 'en' ? 'en' : 'it';
        const date = formatDate(deletionDate, locale);
        const sent = await sendEmail({
          to: user.email,
          subject: locale === 'en'
            ? `The data of ${sanitizeSubjectText(org.name)} will be deleted on ${date} · Anlyra`
            : `I dati di ${sanitizeSubjectText(org.name)} saranno cancellati il ${date} · Anlyra`,
          html: trialDataDeletionNoticeTemplate({
            userName: user.name || user.email,
            userEmail: user.email,
            orgName: org.name,
            deletionDate: date,
            exportUrl: `${siteUrl()}/${locale}/settings/security`,
            billingUrl: `${siteUrl()}/${locale}/settings/billing`,
            locale,
          }),
        });
        if (sent.success) anySent = true;
        else console.error('[email] trial-data-deletion-notice failed', { to: user.email, reason: sent.error });
      }

      if (!anySent) {
        result.failed++;
        continue;
      }
      await prisma.organization.updateMany({
        where: { id: org.id, trialDataDeletionNoticeSentAt: null },
        data: { trialDataDeletionNoticeSentAt: now },
      });
      result.noticesSent++;
      await auditLog({
        action: 'trial_data.deletion_notice',
        organizationId: org.id,
        targetType: 'organization',
        targetId: org.id,
        metadata: { deletionDate: deletionDate.toISOString() },
      });
    } catch (e) {
      result.failed++;
      console.error(`[trial-data] notice for organization ${org.id} failed:`, e);
    }
  }
  return result;
}

export interface TrialDataPurgeResult {
  /** Candidates whose notice has gone out. */
  considered: number;
  /** Notice sent, date not reached yet. */
  notYetDue: number;
  purged: string[];
  /** Protected at the last check: paid meanwhile (e.g. chose a plan after the notice). */
  skippedPaid: number;
  skippedPaymentUnknown: number;
  errors: { organizationId: string; message: string }[];
}

export async function runTrialDataPurge(now: Date = new Date()): Promise<TrialDataPurgeResult> {
  const result: TrialDataPurgeResult = {
    considered: 0,
    notYetDue: 0,
    purged: [],
    skippedPaid: 0,
    skippedPaymentUnknown: 0,
    errors: [],
  };
  const candidates = (await findCandidates(now)).filter(
    (o): o is typeof o & { trialDataDeletionNoticeSentAt: Date } => !!o.trialDataDeletionNoticeSentAt,
  );
  result.considered = candidates.length;

  for (const org of candidates) {
    if (org.id === DEMO_ORG_ID) continue;
    if (trialDataDeletionDate(org.trialEndsAt, org.trialDataDeletionNoticeSentAt).getTime() > now.getTime()) {
      result.notYetDue++;
      continue;
    }
    try {
      // Re-checked right before deleting, never trusted from the notice day.
      const history = await paymentHistory(org.id);
      if (history === 'paid') {
        result.skippedPaid++;
        continue;
      }
      if (history === 'unknown') {
        result.skippedPaymentUnknown++;
        continue;
      }
      await purgeOrganization(org.id);
      result.purged.push(org.id);
      await auditLog({
        action: 'trial_data.purged',
        organizationId: org.id,
        targetType: 'organization',
        targetId: org.id,
        metadata: {
          trialEndedAt: org.trialEndsAt.toISOString(),
          noticeSentAt: org.trialDataDeletionNoticeSentAt.toISOString(),
        },
      });
    } catch (e) {
      console.error(`[trial-data] purge of organization ${org.id} failed:`, e);
      result.errors.push({ organizationId: org.id, message: (e as Error).message });
    }
  }
  return result;
}
