'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { getKpi } from '@/lib/widgets/data';
import type { Widget } from '@/lib/widgets/types';

export function KpiWidget({ widget }: { widget: Widget }) {
  const tMetrics = useTranslations('metrics');
  const tPeriods = useTranslations('periods');
  const locale = useLocale();
  const metric = widget.config.metric ?? 'revenue';
  const period = widget.config.period ?? '30d';
  const color = widget.config.color ?? '#3b82f6';
  const kpi = React.useMemo(() => getKpi(metric, period), [metric, period]);
  const positive = kpi.delta >= 0;

  const formatted = React.useMemo(() => {
    if (kpi.unit === 'currency') return formatCurrency(kpi.current, locale);
    if (kpi.unit === 'percent') return `${formatNumber(kpi.current, locale, { maximumFractionDigits: 1 })}%`;
    return formatNumber(kpi.current, locale, { maximumFractionDigits: 0 });
  }, [kpi, locale]);

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{tMetrics(metric)}</p>
        <p className="text-xs text-slate-400">{tPeriods(period)}</p>
      </div>
      <p className="font-mono text-3xl font-semibold leading-tight" style={{ color }}>
        {formatted}
      </p>
      <div className={`flex items-center gap-1 text-sm font-medium ${positive ? 'text-success' : 'text-danger'}`}>
        {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {formatNumber(Math.abs(kpi.delta), locale, { maximumFractionDigits: 1 })}%
      </div>
    </div>
  );
}
