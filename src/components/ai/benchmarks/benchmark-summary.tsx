'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, AlertOctagon } from 'lucide-react';
import type { BenchmarkStatus } from '@/lib/benchmarks-data';

type Metric = {
  status: BenchmarkStatus | null;
};

type Props = {
  metrics: Metric[];
};

export function BenchmarkSummary({ metrics: rawMetrics }: Props) {
  const t = useTranslations('benchmarks');
  const metrics = rawMetrics.filter((m) => m.status !== null);

  const above = metrics.filter((m) => m.status === 'excellent' || m.status === 'good').length;
  const critical = metrics.filter((m) => m.status === 'critical').length;
  const below = metrics.filter((m) => m.status === 'below' || m.status === 'average').length;
  const total = metrics.length;

  if (total === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="card flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success">
          <TrendingUp className="h-4 w-4" />
        </span>
        <div>
          <p className="text-2xl font-semibold font-heading">{above}</p>
          <p className="text-xs text-muted-foreground">{t('summaryAbove')}</p>
        </div>
      </div>

      <div className="card flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-warning/10 text-warning">
          <TrendingDown className="h-4 w-4" />
        </span>
        <div>
          <p className="text-2xl font-semibold font-heading">{below}</p>
          <p className="text-xs text-muted-foreground">{t('summaryBelow')}</p>
        </div>
      </div>

      <div className="card flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-danger/10 text-danger">
          <AlertOctagon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-2xl font-semibold font-heading">{critical}</p>
          <p className="text-xs text-muted-foreground">{t('summaryCritical')}</p>
        </div>
      </div>
    </div>
  );
}
