'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, BarChart3, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyCompact, formatPercent } from '@/lib/utils';
import type { Locale } from '@/lib/utils';
import type { ForecastSummary } from '@/lib/forecasting';

type Props = {
  summary: ForecastSummary;
  locale: Locale;
};

export function ForecastMetrics({ summary, locale }: Props) {
  const t = useTranslations('forecasting');
  const growthPositive = summary.growthRate >= 0;
  const confidencePct = Math.round(summary.confidence * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Next quarter */}
      <div className="card flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Target className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">{t('summaryNextQuarter')}</span>
        </div>
        <p className="font-heading text-2xl font-semibold">
          {formatCurrencyCompact(summary.nextQuarter, locale)}
        </p>
      </div>

      {/* Growth rate */}
      <div className="card flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          {growthPositive
            ? <TrendingUp className="h-4 w-4 text-success" />
            : <TrendingDown className="h-4 w-4 text-danger" />}
          <span className="text-xs font-medium uppercase tracking-wide">{t('summaryGrowthRate')}</span>
        </div>
        <p className={cn('font-heading text-2xl font-semibold', growthPositive ? 'text-success' : 'text-danger')}>
          {growthPositive ? '+' : ''}{formatPercent(summary.growthRate * 100, locale)}
        </p>
      </div>

      {/* Confidence */}
      <div className="card flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">{t('summaryConfidence')}</span>
        </div>
        <p className="font-heading text-2xl font-semibold">{confidencePct}%</p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full',
              confidencePct >= 80 ? 'bg-success' : confidencePct >= 60 ? 'bg-warning' : 'bg-danger',
            )}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
