/**
 * Parse a monetary amount that may use Italian formatting conventions
 * (thousands separator '.', decimal separator ',') or plain US/JS formatting
 * (decimal '.', no thousands grouping). Returns undefined when unparseable.
 * Shared by import-targets.ts schemas and the bank-statement derivation in
 * parse.ts so the two stay in sync.
 */
export function parseItalianAmount(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  const s = String(raw).trim().replace(/[€$£\s]/g, '');
  if (!s) return undefined;
  const normalized = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}
