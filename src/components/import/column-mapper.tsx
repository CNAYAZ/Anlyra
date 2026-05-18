'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FieldKind } from '@/lib/parsers';
import type { ImportType } from '@/lib/validators';

const FIELDS_BY_TYPE: Record<ImportType, FieldKind[]> = {
  REVENUE: ['ignore', 'date', 'amount', 'currency', 'category', 'description', 'recurring'],
  COST: ['ignore', 'date', 'amount', 'currency', 'category', 'description', 'recurring'],
  KPI: ['ignore', 'date', 'name', 'value', 'target', 'unit'],
  COMPETITOR: [
    'ignore',
    'name',
    'website',
    'description',
    'estimatedRevenue',
    'employees',
    'marketShare',
    'strengths',
    'weaknesses',
  ],
};

export function ColumnMapper({
  headers,
  detected,
  mapping,
  onChange,
  importType,
}: {
  headers: string[];
  detected: Record<string, FieldKind>;
  mapping: Record<string, FieldKind>;
  onChange: (next: Record<string, FieldKind>) => void;
  importType: ImportType;
}) {
  const t = useTranslations('import');
  const tf = useTranslations('import.field');
  const fields = FIELDS_BY_TYPE[importType];

  return (
    <div className="space-y-2">
      <div>
        <div className="font-heading text-base font-semibold text-primary">
          {t('mapping')}
        </div>
        <div className="text-xs text-muted-foreground">{t('mappingHint')}</div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {headers.map((header) => {
          const current = mapping[header] ?? 'ignore';
          const wasDetected = detected[header] && detected[header] !== 'ignore';
          return (
            <div
              key={header}
              className="flex items-center justify-between gap-3 rounded-card border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-primary">
                    {header}
                  </span>
                  {wasDetected ? (
                    <Badge variant="info" className="shrink-0">
                      {t('autoDetected')}
                    </Badge>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">{t('mapToLabel')}</div>
              </div>
              <div className="w-44">
                <Select
                  value={current}
                  onValueChange={(v) =>
                    onChange({ ...mapping, [header]: v as FieldKind })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((f) => (
                      <SelectItem key={f} value={f}>
                        {tf(f)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { FIELDS_BY_TYPE };
