'use client';

import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type KpiCardProps = {
  label: string;
  value: string;
  suffix?: string;
  deltaPercent?: number;
  deltaLabel?: string;
  icon?: LucideIcon;
  tone?: 'positive' | 'negative' | 'neutral';
  invertDelta?: boolean;
};

export function KpiCard({
  label,
  value,
  suffix,
  deltaPercent,
  deltaLabel,
  icon: Icon,
  tone,
  invertDelta = false,
}: KpiCardProps) {
  const hasDelta = typeof deltaPercent === 'number' && Number.isFinite(deltaPercent);
  const rawPositive = hasDelta ? deltaPercent! > 0.05 : false;
  const rawNegative = hasDelta ? deltaPercent! < -0.05 : false;
  const positive = invertDelta ? rawNegative : rawPositive;
  const negative = invertDelta ? rawPositive : rawNegative;

  const resolvedTone = tone ?? (positive ? 'positive' : negative ? 'negative' : 'neutral');
  const accent =
    resolvedTone === 'positive'
      ? 'text-success bg-success/10'
      : resolvedTone === 'negative'
        ? 'text-danger bg-danger/10'
        : 'text-muted-foreground bg-muted';

  const Arrow = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;
  const sign = hasDelta && deltaPercent! > 0 ? '+' : '';

  return (
    <div className="card flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="kpi-label">{label}</span>
        {Icon && (
          <span className="w-8 h-8 rounded-md bg-primary-accent/10 text-primary-accent flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="kpi-value truncate">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground font-medium">{suffix}</span>}
      </div>
      {hasDelta && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-medium', accent)}>
            <Arrow className="w-3 h-3" />
            <span className="num">
              {sign}
              {deltaPercent!.toFixed(1)}%
            </span>
          </span>
          {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}
