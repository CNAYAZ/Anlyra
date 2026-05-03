'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export type ValidationIssue = {
  rowIndex: number;
  field?: string;
  messageKey:
    | 'invalidDate'
    | 'invalidAmount'
    | 'missingRequired'
    | 'duplicateRow';
  severity: 'error' | 'warning';
};

export function ValidationReport({
  issues,
  totalRows,
}: {
  issues: ValidationIssue[];
  totalRows: number;
}) {
  const t = useTranslations('import.validation');
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  if (totalRows === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-sm">
        {errors.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-danger">
            <AlertCircle className="h-4 w-4" />
            {t('errorsFound', { count: errors.length })}
          </span>
        ) : null}
        {warnings.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-warning">
            <AlertTriangle className="h-4 w-4" />
            {t('warningsFound', { count: warnings.length })}
          </span>
        ) : null}
        {errors.length === 0 && warnings.length === 0 ? (
          <span className="inline-flex items-center gap-1 text-success">
            <CheckCircle2 className="h-4 w-4" />
            {t('allValid')}
          </span>
        ) : null}
      </div>
      {issues.length > 0 ? (
        <ul className="max-h-48 space-y-1 overflow-auto rounded-card border border-border bg-white p-3 text-xs">
          {issues.slice(0, 50).map((issue, idx) => (
            <li
              key={idx}
              className={
                issue.severity === 'error' ? 'text-danger' : 'text-warning'
              }
            >
              <span className="font-medium">
                {t('row', { n: issue.rowIndex + 1 })}
              </span>
              {issue.field ? ` · ${issue.field}` : ''} — {t(issue.messageKey)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
