/**
 * Shared contract between the three GDPR pieces: the deletion request
 * (/api/gdpr/account POST), the purge cron (/api/cron/gdpr-purge) and the login
 * block (src/auth.ts). Keeping the window in one place means the UI copy, the
 * grace period and the purge cutoff can never drift apart.
 */
export const DELETION_GRACE_DAYS = 30;

/** Cutoff instant: rows requested BEFORE this are past the grace period. */
export function deletionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
}
