import { parseAmountValue, parseDateValue, type FieldKind } from './parsers';
import type { ImportType } from './validators';
import type { ValidationIssue } from '@/components/import/validation-report';

const REQUIRED: Record<ImportType, FieldKind[]> = {
  REVENUE: ['date', 'amount', 'category'],
  COST: ['date', 'amount', 'category'],
  KPI: ['date', 'name', 'value', 'unit'],
  COMPETITOR: ['name'],
};

export function validateImport({
  rows,
  mapping,
  importType,
}: {
  rows: Record<string, string>[];
  mapping: Record<string, FieldKind>;
  importType: ImportType;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const required = REQUIRED[importType];

  const mappedColumns = new Map<FieldKind, string>();
  for (const [col, kind] of Object.entries(mapping)) {
    if (kind !== 'ignore') mappedColumns.set(kind, col);
  }

  for (const req of required) {
    if (!mappedColumns.has(req)) {
      issues.push({
        rowIndex: -1,
        field: req,
        messageKey: 'missingRequired',
        severity: 'error',
      });
    }
  }

  const seen = new Set<string>();

  rows.forEach((row, rowIndex) => {
    const dateCol = mappedColumns.get('date');
    if (dateCol) {
      const raw = row[dateCol] ?? '';
      if (!raw.trim()) {
        issues.push({ rowIndex, field: 'date', messageKey: 'missingRequired', severity: 'error' });
      } else if (!parseDateValue(raw)) {
        issues.push({ rowIndex, field: 'date', messageKey: 'invalidDate', severity: 'error' });
      }
    }

    const amountCol = mappedColumns.get('amount') ?? mappedColumns.get('value');
    if (amountCol) {
      const raw = row[amountCol] ?? '';
      if (!raw.trim()) {
        issues.push({
          rowIndex,
          field: amountCol,
          messageKey: 'missingRequired',
          severity: 'error',
        });
      } else if (parseAmountValue(raw) === null) {
        issues.push({
          rowIndex,
          field: amountCol,
          messageKey: 'invalidAmount',
          severity: 'error',
        });
      }
    }

    for (const req of required) {
      const col = mappedColumns.get(req);
      if (!col) continue;
      const raw = (row[col] ?? '').toString().trim();
      if (!raw) {
        issues.push({
          rowIndex,
          field: req,
          messageKey: 'missingRequired',
          severity: 'error',
        });
      }
    }

    const key = Object.values(row).join('|');
    if (seen.has(key)) {
      issues.push({
        rowIndex,
        messageKey: 'duplicateRow',
        severity: 'warning',
      });
    } else {
      seen.add(key);
    }
  });

  return issues;
}
