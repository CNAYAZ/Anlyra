'use client';

import { useTranslations } from 'next-intl';
import { ArrowDownRight, ArrowUpRight, CircleDot } from 'lucide-react';
import { cn, type StatusLevel } from '@/lib/utils';

const STATUS_CLASS: Record<StatusLevel, { bg: string; text: string; ring: string }> = {
  good: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-200' },
  warn: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  bad: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
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
          <p className="text-sm font-medium text-slate-600">{label}</p>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
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
              delta >= 0 ? 'text-emerald-600' : 'text-rose-600',
            )}
          >
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>

      {target && (
        <p className="text-xs text-slate-400">
          {target}
        </p>
      )}
    </div>
  );
}
