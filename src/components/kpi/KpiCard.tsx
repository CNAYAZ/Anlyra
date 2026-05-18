'use client';

import { useTranslations } from 'next-intl';
import { ArrowDownRight, ArrowUpRight, CircleDot } from 'lucide-react';
import { cn, type StatusLevel } from '@/lib/utils';

const STATUS_CLASS: Record<StatusLevel, { bg: string; text: string; ring: string }> = {
  good: { bg: 'bg-success/10', text: 'text-success', ring: 'ring-success/30' },
  warn: { bg: 'bg-warning/10', text: 'text-warning', ring: 'ring-warning/30' },
  bad: { bg: 'bg-danger/10', text: 'text-danger', ring: 'ring-danger/30' },
};

export interface KpiCardProps {
  label: string;
  description?: string;
  value: string;
  status: StatusLevel;
  delta?: number;
  target?: string;
}

export function KpiCard({ label, description, value, status, delta, target }: KpiCardProps) {
  const t = useTranslations('operations.status');
  const colors = STATUS_CLASS[status];
  const statusLabel =
    status === 'good'
      ? t('onTarget')
      : status === 'warn'
        ? t('warning')
        : t('offTarget');

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <span
          className={cn(
            'badge ring-1',
            colors.bg,
            colors.text,
            colors.ring,
          )}
          aria-label={statusLabel}
          title={statusLabel}
        >
          <CircleDot className="h-3 w-3" />
          {statusLabel}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className={cn('num text-3xl font-semibold', colors.text)}>{value}</p>
        {delta !== undefined && (
          <span
            className={cn(
              'inline-flex items-center text-xs font-medium num',
              delta >= 0 ? 'text-success' : 'text-danger',
            )}
          >
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>

      {target && (
        <p className="text-xs text-muted-foreground">
          {target}
        </p>
      )}
    </div>
  );
}
