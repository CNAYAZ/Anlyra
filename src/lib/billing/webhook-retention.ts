import { prisma } from '@/lib/prisma';

/**
 * How long a processed Stripe event id is remembered. Stripe retries a failed
 * webhook for up to ~3 days; 30 days is an order of magnitude beyond that, so a
 * row can only be dropped long after any retry could still arrive — while
 * keeping the table from growing without bound (one row per event, forever,
 * would otherwise outlive the business).
 */
export const WEBHOOK_EVENT_RETENTION_DAYS = 30;

/**
 * Deletes idempotency records older than the retention window.
 *
 * Piggy-backs on the EXISTING nightly gdpr-purge cron rather than introducing a
 * new schedule: the work is a single indexed DELETE, it has no urgency, and a
 * second cron would be one more thing to configure on Vercel and to remember.
 *
 * Safe by construction: it only ever removes rows strictly older than the
 * cutoff, so an event still inside Stripe's retry horizon is never forgotten.
 */
export async function purgeOldWebhookEvents(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - WEBHOOK_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.stripeWebhookEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return count;
}
