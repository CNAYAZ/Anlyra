'use client';

import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AlertSeverity, AlertStatus } from '@/types/ai';

export type AlertFilterValues = {
  severity: AlertSeverity | 'ALL';
  status: AlertStatus | 'ALL';
};

type Props = {
  values: AlertFilterValues;
  onChange: (values: AlertFilterValues) => void;
};

const SEVERITIES: (AlertSeverity | 'ALL')[] = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUSES: (AlertStatus | 'ALL')[] = ['ALL', 'NEW', 'READ', 'RESOLVED', 'DISMISSED'];

export function AlertFilters({ values, onChange }: Props) {
  const t = useTranslations('alerts');

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-xs font-medium text-muted-foreground">{t('filterSeverity')}</label>
        <Select
          value={values.severity}
          onValueChange={(v) => onChange({ ...values, severity: v as AlertSeverity | 'ALL' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITIES.map((v) => (
              <SelectItem key={v} value={v}>
                {v === 'ALL' ? t('all') : t(`severity.${v}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-xs font-medium text-muted-foreground">{t('filterStatus')}</label>
        <Select
          value={values.status}
          onValueChange={(v) => onChange({ ...values, status: v as AlertStatus | 'ALL' })}
        >
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
