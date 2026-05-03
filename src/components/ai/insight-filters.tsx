'use client';

import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { InsightPriority, InsightStatus, InsightType } from '@prisma/client';

export type InsightFilterValues = {
  type: InsightType | 'ALL';
  priority: InsightPriority | 'ALL';
  status: InsightStatus | 'ALL';
};

type Props = {
  values: InsightFilterValues;
  onChange: (values: InsightFilterValues) => void;
};

const TYPES: (InsightType | 'ALL')[] = ['ALL', 'STRATEGY', 'WARNING', 'OPPORTUNITY', 'ACTION'];
const PRIORITIES: (InsightPriority | 'ALL')[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUSES: (InsightStatus | 'ALL')[] = ['ALL', 'NEW', 'REVIEWED', 'IMPLEMENTED', 'IGNORED'];

export function InsightFilters({ values, onChange }: Props) {
  const t = useTranslations('insights');

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-xs font-medium text-muted-foreground">{t('filterType')}</label>
        <Select value={values.type} onValueChange={(v) => onChange({ ...values, type: v as InsightType | 'ALL' })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((v) => (
              <SelectItem key={v} value={v}>
                {v === 'ALL' ? t('all') : t(`type.${v}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-xs font-medium text-muted-foreground">{t('filterPriority')}</label>
        <Select
          value={values.priority}
          onValueChange={(v) => onChange({ ...values, priority: v as InsightPriority | 'ALL' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((v) => (
              <SelectItem key={v} value={v}>
                {v === 'ALL' ? t('all') : t(`priority.${v}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-xs font-medium text-muted-foreground">{t('filterStatus')}</label>
        <Select value={values.status} onValueChange={(v) => onChange({ ...values, status: v as InsightStatus | 'ALL' })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((v) => (
              <SelectItem key={v} value={v}>
                {v === 'ALL' ? t('all') : t(`status.${v}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
