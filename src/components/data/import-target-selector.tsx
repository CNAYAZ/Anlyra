'use client';

import { useTranslations } from 'next-intl';
import { Banknote, Gauge, Users, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IMPORT_TARGETS, type ImportTargetKey } from '@/lib/import-targets';

const ICON_MAP: Record<ImportTargetKey, typeof Banknote> = {
  financial_records: Banknote,
  kpis: Gauge,
  competitors: Swords,
  customer_stats: Users,
};

type Props = {
  value: ImportTargetKey | null;
  onChange: (value: ImportTargetKey) => void;
};

export function ImportTargetSelector({ value, onChange }: Props) {
  const t = useTranslations('dataImport');
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {IMPORT_TARGETS.map((target) => {
        const Icon = ICON_MAP[target.key];
        const selected = value === target.key;
        return (
          <button
            key={target.key}
            type="button"
            onClick={() => onChange(target.key)}
            className={cn(
              'card flex flex-col gap-2 text-left transition-colors hover:border-primary-accent',
              selected && 'border-primary-accent ring-2 ring-primary-accent/30',
            )}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-accent/10 text-primary-accent">
              <Icon className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold">{t(target.labelKey as 'targetFinancial')}</h3>
            <p className="text-xs text-muted-foreground">{t(target.descriptionKey as 'targetFinancialDesc')}</p>
          </button>
        );
      })}
    </div>
  );
}
