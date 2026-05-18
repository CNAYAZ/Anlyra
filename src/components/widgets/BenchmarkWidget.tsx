'use client';

import { useLocale, useTranslations } from 'next-intl';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { getBenchmark } from '@/lib/widgets/data';
import type { Widget } from '@/lib/widgets/types';

export function BenchmarkWidget({ widget }: { widget: Widget }) {
  const locale = useLocale();
  const tMetrics = useTranslations('metrics');
  const metric = widget.config.metric ?? 'margin';
  const data = getBenchmark(metric);

  const fmt = (v: number) => {
    if (data.unit === 'currency') return formatCurrency(v, locale);
    if (data.unit === 'percent') return `${formatNumber(v, locale, { maximumFractionDigits: 1 })}%`;
    return formatNumber(v, locale, { maximumFractionDigits: 0 });
  };

  const max = Math.max(data.you, data.industry, data.top10);
  const rows: Array<{ label: string; value: number; color: string }> = [
    { label: locale === 'it' ? 'La tua azienda' : 'Your company', value: data.you, color: '#3b82f6' },
    { label: locale === 'it' ? 'Settore' : 'Industry', value: data.industry, color: '#94a3b8' },
    { label: 'Top 10%', value: data.top10, color: '#0d9488' },
  ];

  return (
    <div className="flex h-full flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tMetrics(metric)}</p>
      <div className="flex flex-1 flex-col justify-center gap-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-mono text-bg-dark">{fmt(r.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${(r.value / max) * 100}%`, background: r.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
