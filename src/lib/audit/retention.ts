import { prisma } from '@/lib/prisma';
import type { AuditAction } from './actions';

/**
 * How long an audit row is kept.
 *
 * 12 months is not a number picked here: it is the number the Privacy Policy
 * already promises ("Log di sistema e audit log: conservati per un massimo di
 * 12 mesi dalla loro creazione"). Until this file existed, NOTHING in the code
 * deleted an audit row — ever — so that sentence was an impegno the product did
 * not keep, and rows carrying a user id and an IP address accumulated without
 * end. Changing the code was the honest fix; softening the sentence was the
 * other option and the founder chose this one.
 *
 * If this constant ever changes, the Privacy Policy has to change with it.
 * They are one statement expressed twice, and this is the half that is true.
 */
export const AUDIT_LOG_RETENTION_MONTHS = 12;

/**
 * The actions this sweep must NEVER remove.
 *
 * `auth.terms_accepted` is not a security log: it is the record that a person
 * accepted the Privacy Policy and the Terms of Service and declared they were
 * of age (see /api/auth/register). It is the evidence behind a contract that
 * lasts as long as the account does, so deleting it after 12 months would
 * destroy the proof of the very thing the legal pages claim. A retention rule
 * written for logs must not eat a contract.
 *
 * Typed as AuditAction, so a typo here is a compile error rather than an
 * exemption that silently never matches anything.
 */
export const AUDIT_RETENTION_EXEMPT_ACTIONS: readonly AuditAction[] = ['auth.terms_accepted'];

/**
 * The instant before which an audit row is too old to keep.
 *
 * Calendar months, not 365 days: the promise is expressed in months, so the
 * cutoff is too. A 29 February rolls over to 1 March in a non-leap year, which
 * moves a boundary row by one day and matters to nobody.
 */
export function auditRetentionCutoff(now: Date = new Date()): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCMonth(cutoff.getUTCMonth() - AUDIT_LOG_RETENTION_MONTHS);
  return cutoff;
}

/**
 * Deletes audit rows older than the retention window, except the exempt actions.
 *
 * Piggy-backs on the EXISTING nightly gdpr-purge cron — the same choice, and for
 * the same reasons, as purgeOldWebhookEvents in @/lib/billing/webhook-retention:
 * one indexed DELETE, no urgency, and the two cron slots available on this plan
 * are already taken.
 *
 * Safe by construction: the filter is `createdAt < cutoff`, so a row inside the
 * window can never be caught, and there is no path here that deletes without a
 * where clause.
 */
export async function purgeOldAuditLogs(now: Date = new Date()): Promise<number> {
  const cutoff = auditRetentionCutoff(now);
  const { count } = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      action: { notIn: [...AUDIT_RETENTION_EXEMPT_ACTIONS] },
    },
  });
  return count;
}
