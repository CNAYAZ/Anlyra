'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportTarget } from '@/lib/import-targets';
import { applyMapping, validateRows } from '@/lib/import/validate';

type Props = {
  target: ImportTarget;
  /** ALL parsed rows: validation summary covers the whole file, table shows first 10. */
  rows: Record<string, unknown>[];
  mapping: Record<string, string | null>;
};

const MAX_ERRORS_SHOWN = 50;

export function ImportPreview({ target, rows, mapping }: Props) {
  const t = useTranslations('dataImport');

  const { validRows, errors } = useMemo(
    () => validateRows(target, mapping, rows),
    [rows, mapping, target],
  );
  const invalidRowNumbers = useMemo(() => new Set(errors.map((e) => e.row)), [errors]);

  const previewRows = useMemo(
    () =>
      rows.slice(0, 10).map((row, idx) => {
        const mapped = applyMapping(row, mapping);
        const result = target.schema.safeParse(mapped);
        return {
          mapped,
          valid: !invalidRowNumbers.has(idx + 1),
          data: result.success ? (result.data as Record<string, unknown>) : null,
        };
      }),
    [rows, mapping, target, invalidRowNumbers],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold">{t('previewTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('previewDescription')}</p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 font-num font-semibold uppercase text-muted-foreground">
          {rows.length} {t('previewTotalRows')}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 font-num font-semibold uppercase text-success">
          <Check className="h-3 w-3" /> {validRows.length} {t('previewValidRow')}
        </span>
        {invalidRowNumbers.size > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-1 font-num font-semibold uppercase text-danger">
            <X className="h-3 w-3" /> {invalidRowNumbers.size} {t('previewInvalidRow')}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              {target.fields.map((f) => (
                <th key={f.key} className="px-3 py-2 text-left">
                  {t(f.labelKey as 'fieldName')}
                </th>
              ))}
              <th className="px-3 py-2 text-left">{t('previewStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((r, idx) => (
              <tr key={idx} className={cn('border-t border-border', !r.valid && 'bg-danger/5')}>
                <td className="px-3 py-2 font-num text-xs text-muted-foreground">{idx + 1}</td>
                {target.fields.map((f) => {
                  const value = r.data?.[f.key] ?? r.mapped[f.key];
                  return (
                    <td key={f.key} className="px-3 py-2 font-num text-xs">
                      {value === null || value === undefined || value === ''
                        ? '—'
                        : String(value)}
                    </td>
                  );
                })}
                <td className="px-3 py-2">
                  {r.valid ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <X className="h-4 w-4 text-danger" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errors.length > 0 && (
        <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold">{t('previewErrorsTitle')}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t('previewErrorsDescription')}</p>
          <ul className="space-y-1 text-xs">
            {errors.slice(0, MAX_ERRORS_SHOWN).map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-num shrink-0 font-semibold">
                  {t('previewErrorRow')} {e.row}
                </span>
                {e.field && <span className="shrink-0 text-muted-foreground">[{e.field}]</span>}
                <span>{e.message}</span>
              </li>
            ))}
            {errors.length > MAX_ERRORS_SHOWN && (
              <li className="font-num text-muted-foreground">+{errors.length - MAX_ERRORS_SHOWN}…</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
