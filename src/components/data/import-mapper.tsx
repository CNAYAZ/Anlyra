'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ImportTarget } from '@/lib/import-targets';

export type ColumnInfo = { name: string; samples: string[] };

type Props = {
  target: ImportTarget;
  columns: ColumnInfo[];
  mapping: Record<string, string | null>;
  /** mapping where automatic suggestions came from (used to highlight green) */
  suggested: Record<string, string | null>;
  onChange: (mapping: Record<string, string | null>) => void;
};

const IGNORE = '__ignore__';

export function ImportMapper({ target, columns, mapping, suggested, onChange }: Props) {
  const t = useTranslations('dataImport');

  const usedFields = useMemo(() => {
    const set = new Set<string>();
    for (const v of Object.values(mapping)) if (v) set.add(v);
    return set;
  }, [mapping]);

  const missingRequired = useMemo(
    () => target.fields.filter((f) => f.required && !usedFields.has(f.key)),
    [target, usedFields],
  );

  function setColumn(col: string, field: string | null) {
    onChange({ ...mapping, [col]: field });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold">{t('mappingTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('mappingDescription')}</p>
      </div>

      {missingRequired.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <AlertCircle className="h-4 w-4" />
          <span>
            {t('mappingRequiredMissing')}:{' '}
            {missingRequired
              .map((f) => t(f.labelKey as 'fieldName'))
              .join(', ')}
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">{t('mappingSourceColumn')}</th>
              <th className="px-4 py-3 text-left">{t('mappingTargetField')}</th>
              <th className="px-4 py-3 text-left">{t('mappingSamples')}</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => {
              const current = mapping[col.name] ?? null;
              const wasSuggested = suggested[col.name] && suggested[col.name] === current;
              return (
                <tr key={col.name} className="border-t border-border">
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{col.name}</span>
                      {wasSuggested && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-success"
                          title={t('mappingAutoSuggested')}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {t('mappingAutoSuggested')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Select
                      value={current ?? IGNORE}
                      onValueChange={(v) => setColumn(col.name, v === IGNORE ? null : v)}
                    >
                      <SelectTrigger className={cn('w-[220px]')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={IGNORE}>{t('mappingIgnore')}</SelectItem>
                        {target.fields.map((f) => (
                          <SelectItem
                            key={f.key}
                            value={f.key}
                            disabled={usedFields.has(f.key) && current !== f.key}
                          >
                            {t(f.labelKey as 'fieldName')}
                            {f.required ? ' *' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                    {col.samples.slice(0, 3).filter(Boolean).join(' • ') || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
