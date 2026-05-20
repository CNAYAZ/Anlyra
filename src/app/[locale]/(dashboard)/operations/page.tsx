'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState, KpiSkeleton } from '@/components/ui/state';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

type KpiPoint = {
  key: string;
  value: number;
  delta: number;
  target: number;
  status: 'good' | 'warn' | 'bad';
  unit: 'percent' | 'number' | 'currency' | 'score';
};

type Overview = { kpis: KpiPoint[]; gauges: { key: string; value: number; status: string; unit: string }[] };

const LABELS: Record<string, string> = {
  churnRate: 'Churn rate',
  retention: 'Retention',
  nps: 'NPS',
  conversionRate: 'Conversion rate',
  revenuePerEmployee: 'Ricavi / dipendente',
};

function formatValue(unit: KpiPoint['unit'], value: number, locale: string) {
  if (unit === 'percent') return formatPercent(value, locale);
  if (unit === 'currency') return formatCurrency(value, locale);
  if (unit === 'score') return formatNumber(value, locale, 0);
  return formatNumber(value, locale, 0);
}

function toDelta(
  pct: number | null | undefined,
  locale: string,
  invert = false,
): { value: string; sentiment: 'positive' | 'negative'; direction: 'up' | 'down' | 'flat' } | undefined {
  if (pct == null) return undefined;
  const good = invert ? pct <= 0 : pct >= 0;
  return {
    value: formatPercent(pct, locale),
    sentiment: good ? 'positive' : 'negative',
    direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
  };
}

export default function OperationsOverviewPage() {
  const locale = useAppLocale();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['operations', 'overview'],
    queryFn: () => apiFetch<Overview>('/api/analysis/operations'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Operations" subtitle="KPI operativi della tua azienda" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          data.kpis.map((k) => (
            <KpiCard
              key={k.key}
              label={LABELS[k.key] ?? k.key}
              value={formatValue(k.unit, k.value, locale)}
              delta={toDelta(k.delta, locale, k.key === 'churnRate')}
              icon={Activity}
            />
          ))
        )}
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader title="Indicatori chiave" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {data.kpis.map((k) => (
              <div key={k.key} className="rounded-lg border border-border p-3">
                <div className="text-xs uppercase text-muted-foreground">{LABELS[k.key] ?? k.key}</div>
                <div className="mt-1 text-lg font-semibold">{formatValue(k.unit, k.value, locale)}</div>
                <div className="text-xs text-muted-foreground">target: {formatValue(k.unit, k.target, locale)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
