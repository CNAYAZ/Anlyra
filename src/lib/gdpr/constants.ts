/**
 * Shared contract between the GDPR deletion pieces: the deletion request and
 * its cancellation (/api/gdpr/account POST/DELETE), and the purge cron
 * (/api/cron/gdpr-purge). Keeping the window in one place means the UI copy,
 * the grace period and the purge cutoff can never drift apart.
 *
 * CORRECTED — the login block in src/auth.ts was listed here as a third
 * consumer of this constant, which does not hold: checked before writing this,
 * that block only tests `if (user.deletionRequestedAt)` — it blocks login for
 * the WHOLE grace period, from the moment the request is made, and never reads
 * DELETION_GRACE_DAYS or deletionCutoff to decide anything. Its behaviour is
 * conceptually consistent with this window (a blocked account stays blocked
 * for as long as the row survives), but there is no code dependency to keep in
 * sync — nothing there would break if this number changed.
 */
export const DELETION_GRACE_DAYS = 30;

/** Cutoff instant: rows requested BEFORE this are past the grace period. */
export function deletionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
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
