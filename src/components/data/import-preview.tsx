'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportTarget } from '@/lib/import-targets';

type Props = {
  target: ImportTarget;
  rows: Record<string, unknown>[];
  mapping: Record<string, string | null>;
};

export function ImportPreview({ target, rows, mapping }: Props) {
  const t = useTranslations('dataImport');

  const previewRows = rows.slice(0, 10);

  const validatedRows = useMemo(() => {
    return previewRows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [col, field] of Object.entries(mapping)) {
        if (!field) continue;
        mapped[field] = row[col];
      }
      const result = target.schema.safeParse(mapped);
      return { mapped, valid: result.success, data: result.success ? result.data : null };
    });
  }, [previewRows, mapping, target]);

  const validCount = validatedRows.filter((r) => r.valid).length;
  const invalidCount = validatedRows.length - validCount;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold">{t('previewTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('previewDescription')}</p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 font-semibold uppercase text-success">
          <Check className="h-3 w-3" /> {validCount} {t('previewValidRow')}
        </span>
        {invalidCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-1 font-semibold uppercase text-danger">
            <X className="h-3 w-3" /> {invalidCount} {t('previewInvalidRow')}
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
            {validatedRows.map((r, idx) => (
              <tr key={idx} className={cn('border-t border-border', !r.valid && 'bg-danger/5')}>
                <td className="px-3 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                {target.fields.map((f) => {
                  const value = (r.data as Record<string, unknown> | null)?.[f.key] ?? r.mapped[f.key];
                  return (
                    <td key={f.key} className="px-3 py-2 text-xs">
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
    </div>
  );
}
