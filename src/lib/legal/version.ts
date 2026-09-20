/**
 * Single source of truth for WHICH version of the Privacy Policy and Terms of
 * Service is currently in force — the version registration and re-acceptance
 * compare against.
 *
 * ── WHY A SEPARATE CONSTANT, NOT THE "lastRevised" TEXT ──
 * The legal pages already show a revision date ("Ultima revisione: 17 maggio
 * 2026" for privacy and terms — VERIFIED in src/messages/it.json under
 * legal.privacy.lastRevised / legal.terms.lastRevised), but it is baked into a
 * full, translated PROSE SENTENCE, not a separate machine-readable field.
 * There is no ICU placeholder to read it out of, and next-intl has no API to
 * extract a substring from a translated string. Code cannot read that date —
 * confirmed by reading legal-page.tsx and both message files before writing
 * this. So it has to be declared again, here, as data.
 *
 * ── THIS IS A SEPARATE SOURCE, KEPT IN SYNC BY HAND ──
 * Same trade-off src/lib/company.ts documents for the same reason: legal prose
 * is written and reviewed as a human sentence, not assembled from placeholders.
 * Whoever changes the wording of privacy or terms — a REAL change to what is
 * being agreed to, not a typo fix — MUST update CURRENT_LEGAL_VERSION here too,
 * in the same change. Nothing in the code enforces that link; this comment and
 * the founder's process are what enforce it. A typo fix does not need a version
 * bump; a change to what Anlyra does with data, or to a right or obligation,
 * does.
 *
 * ── SCOPE: PRIVACY + TERMS TOGETHER, NOT COOKIES ──
 * The signup consent checkbox (src/messages/{it,en}.json, key signup.consent)
 * declares acceptance of the Privacy Policy and the Terms of Service only —
 * verified in the text: "Dichiaro di aver letto la Privacy Policy e i Termini
 * di Servizio, e di avere almeno 18 anni." The Cookie Policy is not part of
 * that declaration (it has its own, separate notice — the cookie banner) and
 * is deliberately not covered by this version. One combined version for privacy
 * and terms is correct today because they are revised together (both show
 * "17 maggio 2026"); if they ever diverge, this becomes two constants, not one.
 *
 * ── FORMAT ──
 * An ISO date (YYYY-MM-DD), so versions compare with plain string/date
 * comparison and sort chronologically without parsing.
 *
 * The registration commit only defined and wrote this value. This function is
 * the second, separate change: the first thing in the codebase that reads it
 * back to decide anything.
 */
export const CURRENT_LEGAL_VERSION = '2026-05-17';

/**
 * Whether a person needs to (re)accept the current Privacy Policy + Terms.
 *
 * `null`/`undefined` counts as needing acceptance. This covers TWO different
 * facts with one answer, deliberately:
 *   • an account created before the termsAcceptedVersion column existed —
 *     they accepted SOMETHING, under the old checkbox-less flow, but there is
 *     no record of which text;
 *   • an account created after, whose write somehow failed.
 * Either way the true, honest answer is "we hold no record that this person
 * accepted the current documents", so both are treated the same: asked, not
 * blocked (see LegalReacceptBanner — this is a judgment call, not a fact read
 * off the code; see the session report for the reasoning and the alternative
 * that was rejected).
 */
export function needsLegalReaccept(acceptedVersion: string | null | undefined): boolean {
  return acceptedVersion !== CURRENT_LEGAL_VERSION;
}
