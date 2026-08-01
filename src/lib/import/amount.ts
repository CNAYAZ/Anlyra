/**
 * Parse a monetary amount that may use Italian formatting conventions
 * (thousands separator '.', decimal separator ',') or US formatting
 * (thousands separator ',', decimal separator '.'). Returns undefined when
 * unparseable. Shared by import-targets.ts schemas and the bank-statement
 * derivation in parse.ts so the two stay in sync.
 */
export function parseItalianAmount(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  const s = String(raw).trim().replace(/[€$£\s]/g, '');
  if (!s) return undefined;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  let normalized: string;
  if (hasComma && hasDot) {
    // Both separators present: whichever appears LAST is the decimal point,
    // the other is thousands grouping (possibly repeated, e.g. "12,000,000.00").
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    normalized =
      lastComma > lastDot
        ? s.slice(0, lastComma).replace(/[.,]/g, '') + '.' + s.slice(lastComma + 1).replace(/\./g, '')
        : s.replace(/,/g, '');
  } else if (hasComma) {
    // Comma only: Italian decimal convention (e.g. "89,90", "-89,90").
    normalized = s.replace(',', '.');
  } else {
    // Dot only: ambiguous between a US-style decimal ("1234.56") and Italian
    // thousands grouping typed without decimals ("12.000"). Disambiguate by
    // shape: a dot followed by exactly 3 digits and then a non-digit (or the
    // string's end) is a thousands group, so it's stripped — this also
    // resolves multi-group numbers like "1.234.567". Anything else (1 or 2
    // trailing digits) is left as the decimal point. This means a bare
    // "1.234" reads as 1234 (thousands), not 1.234 (decimal) — the same
    // choice this heuristic already made before this fix, kept for
    // consistency with real bank/Excel exports where amounts without decimals
    // are far more common than 3-decimal-place values.
    normalized = s.replace(/\.(?=\d{3}(\D|$))/g, '');
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}
