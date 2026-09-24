/**
 * Shared contract between the GDPR deletion pieces: the deletion request and
 * its cancellation (/api/gdpr/account POST/DELETE), and the purge cron
 * (/api/cron/gdpr-purge). Keeping the window in one place means the UI copy,
 * the grace period and the purge cutoff can never drift apart.
 *
 * Third consumer, since login was reopened during the grace period (the
 * founder's decision — sign in, but ONLY to cancel): src/auth.ts and
 * /api/auth/precheck refuse a pending account only once it is past this window
 * (isPastGrace below). Inside the window the account signs in and is confined
 * to the cancellation screen — see `deletionPendingUserId` in src/auth.ts.
 * Changing this number now changes how long that door stays open, too.
 */
export const DELETION_GRACE_DAYS = 30;

/** Cutoff instant: rows requested BEFORE this are past the grace period. */
export function deletionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * True once a request made at `requestedAt` is past the grace period — the
 * exact same test the purge applies (`lt: cutoff`, src/lib/gdpr/purge.ts), so
 * "too late to cancel" and "the next purge run deletes it" can never disagree.
 * Between that instant and the nightly cron the rows still exist, but the
 * deletion is already definitive: login and cancellation are both refused.
 */
export function isPastGrace(requestedAt: Date, now: Date = new Date()): boolean {
  return requestedAt < deletionCutoff(now);
}

/**
 * Whole days left in the grace period for a request made at `requestedAt`,
 * for display only ("mancano N giorni"). Never negative — a request whose
 * window has technically lapsed but that the nightly cron has not purged yet
 * shows 0, not a confusing negative count.
 */
export function daysRemainingInGrace(requestedAt: Date, now: Date = new Date()): number {
  const purgeAt = requestedAt.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - now.getTime()) / (24 * 60 * 60 * 1000)));
}
