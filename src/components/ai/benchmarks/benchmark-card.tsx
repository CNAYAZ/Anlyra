'use client';

import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BenchmarkStatus, MetricKey } from '@/lib/benchmarks-data';
import { METRIC_LOWER_IS_BETTER } from '@/lib/benchmarks-data';

const METRIC_LABEL_KEY: Record<MetricKey, string> = {
  churnRate: 'metricChurn',
  nps: 'metricNps',
  conversionRate: 'metricConversion',
  grossMargin: 'metricGrossMargin',
  cacPayback: 'metricCacPayback',
  ltvCacRatio: 'metricLtvCac',
  mrrGrowthRate: 'metricMrrGrowth',
  netDollarRetention: 'metricNdr',
};

const STATUS_BADGE: Record<BenchmarkStatus, string> = {
  excellent: 'bg-success/10 text-success border-success/40',
  good: 'bg-success/10 text-success border-success/30',
  average: 'bg-warning/10 text-warning border-warning/40',
  below: 'bg-warning/10 text-warning border-warning/40',
  critical: 'bg-danger/10 text-danger border-danger/40',
};

const STATUS_KEY: Record<BenchmarkStatus, string> = {
  excellent: 'statusExcellent',
  good: 'statusGood',
  average: 'statusAverage',
  below: 'statusBelow',
  critical: 'statusCritical',
};

type Props = {
  metric: MetricKey;
  companyValue: number | null;
  p25: number;
  p50: number;
  p75: number;
  unit: 'percent' | 'months' | 'ratio' | 'score';
  status: BenchmarkStatus | null;
};

function formatValue(value: number, unit: Props['unit']): string {
  const v = Math.round(value * 10) / 10;
  switch (unit) {
    case 'percent': return `${v}%`;
    case 'months':  return `${v} mo`;
    case 'ratio':   return `${v}x`;
    case 'score':   return `${v}`;
  }
}

export function BenchmarkCard({ metric, companyValue, p25, p50, p75, unit, status }: Props) {
  const t = useTranslations('benchmarks');
  const hasValue = companyValue !== null && status !== null;
  const lowerBetter = METRIC_LOWER_IS_BETTER.has(metric);

  // Compare vs median
  let direction: 'above' | 'below' | 'equal' = 'equal';
  if (hasValue && companyValue !== null) {
    if (companyValue > p50 * 1.02) direction = 'above';
    else if (companyValue < p50 * 0.98) direction = 'below';
  }
  const goodDirection = lowerBetter ? 'below' : 'above';
  const isGood = direction === goodDirection;

  // Compute mini-bar position (where value sits between p25 and p75)
  const lo = Math.min(p25, p75);
  const hi = Math.max(p25, p75);
  const range = hi - lo;
  const pos = hasValue && range > 0 && companyValue !== null
    ? Math.max(0, Math.min(100, ((companyValue - lo) / range) * 100))
    : 50;

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{t(METRIC_LABEL_KEY[metric])}</h3>
        {hasValue && status && (
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase', STATUS_BADGE[status])}>
            {t(STATUS_KEY[status])}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <p className="font-heading text-3xl font-semibold">
          {hasValue && companyValue !== null ? formatValue(companyValue, unit) : '—'}
        </p>
        {hasValue && direction !== 'equal' && (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-xs font-medium',
            isGood ? 'text-success' : 'text-danger',
          )}>
            {direction === 'above' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {direction === 'above' ? t('vsMedianAbove') : t('vsMedianBelow')}
          </span>
        )}
        {hasValue && direction === 'equal' && (
          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            <Minus className="h-3 w-3" /> ≈
          </span>
        )}
      </div>

      {/* Mini bar showing where value sits between p25 and p75 */}
      <div className="space-y-1">
        <div className="relative h-2 w-full rounded-full bg-muted">
          {/* Median marker */}
          <div className="absolute top-0 h-2 w-px bg-foreground/40" style={{ left: '50%' }} />
          {/* Value marker */}
          {hasValue && (
            <div
              className="absolute -top-0.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-background bg-primary-accent"
              style={{ left: `${pos}%` }}
              aria-label="company-value"
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{t('percentile25')}: {formatValue(p25, unit)}</span>
          <span>{t('percentile50')}: {formatValue(p50, unit)}</span>
          <span>{t('percentile75')}: {formatValue(p75, unit)}</span>
        </div>
      </div>
    </div>
  );
}
