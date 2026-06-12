import type { ImportTarget } from '@/lib/import-targets';

export type RowError = { row: number; field?: string; message: string };

export type ValidationResult = {
  validRows: Record<string, unknown>[];
  errors: RowError[];
};

/** Apply a column→field mapping to a raw parsed row. */
export function applyMapping(
  row: Record<string, unknown>,
  mapping: Record<string, string | null>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [sourceCol, targetField] of Object.entries(mapping)) {
    if (!targetField || targetField === 'ignore') continue;
    out[targetField] = row[sourceCol];
  }
  return out;
}

/**
 * Validate all rows against the target schema. Row numbers are 1-based data
 * rows (header excluded). Error messages come from the zod schemas in
 * import-targets.ts and are in Italian for the financial_records target.
 * Shared by: commit API route (authoritative), preview UI, test script.
 */
export function validateRows(
  target: ImportTarget,
  mapping: Record<string, string | null>,
  rows: Record<string, unknown>[],
): ValidationResult {
  const errors: RowError[] = [];
  const validRows: Record<string, unknown>[] = [];

  rows.forEach((rawRow, idx) => {
    const mapped = applyMapping(rawRow, mapping);
    const result = target.schema.safeParse(mapped);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          row: idx + 1,
          field: issue.path.join('.'),
          message: issue.message,
        });
      }
      return;
    }
    validRows.push(result.data as Record<string, unknown>);
  });

  return { validRows, errors };
}

/**
 * Build financialRecord.description in the MANDATORY 'categoria/sottocategoria'
 * format (or bare 'categoria'). Analytics pages split on '/' to derive
 * categories; any other format breaks them.
 */
export function buildFinancialDescription(row: Record<string, unknown>): string {
  const category = String(row.category ?? '').trim() || 'other';
  const subcategory = String(row.subcategory ?? '').trim();
  return subcategory ? `${category}/${subcategory}` : category;
}
