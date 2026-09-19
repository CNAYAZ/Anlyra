/**
 * The "looks like the same movement" fingerprint: date + amount + description.
 *
 * Used on BOTH sides of the comparison — the rows being imported and the rows
 * already in the database — so there is exactly one definition of what "the
 * same movement" means.
 *
 * ── THE DATE IS COMPARED AS AN EXACT INSTANT, NOT AS A DAY STRING ──
 * Deliberately. Dates in this schema are stored as UTC midnight ITALIAN time,
 * so `toISOString().slice(0,10)` returns the wrong day (see the timezone rule
 * in CLAUDE.md §7 and src/lib/timezone.ts). Both sides of this comparison
 * reach the Date through the very same code path — the `requiredDate` schema in
 * import-targets.ts, which normalizes '05/01/2026' and '2026-01-05' to the same
 * ISO string — so identical source dates produce identical timestamps, and no
 * day has to be extracted at all. That side-steps the whole day-boundary trap
 * instead of trying to get it right twice.
 *
 * ── THE AMOUNT IS ROUNDED TO CENTS ──
 * It is money, and it is stored as a Float. Two values that are the same amount
 * must fingerprint the same even if one of them arrived through a different
 * text form, so both sides are rounded to two decimals before comparing.
 *
 * ── THE DESCRIPTION IS COMPARED CASE-INSENSITIVELY ──
 * financialRecord.description is always 'categoria/sottocategoria' (built by
 * buildFinancialDescription), and a file exported twice can differ only in
 * capitalization. Trimmed and lowercased so that difference does not hide a
 * movement that is otherwise identical.
 */
export function rowFingerprint(occurredAt: Date, amount: number, description: string): string {
  const cents = Math.round(amount * 100);
  return `${occurredAt.getTime()}|${cents}|${description.trim().toLowerCase()}`;
}
