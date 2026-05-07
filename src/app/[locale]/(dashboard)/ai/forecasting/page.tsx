'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LineChart as LineIcon, Sparkles } from 'lucide-react';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState } from '@/components/ui/state';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import type { KpiSummary, MonthlySeriesPoint } from '@/lib/analysis/financial';

type FinanceResp = {
  kpis: KpiSummary;
  series: MonthlySeriesPoint[];
};

type Metric = 'revenue' | 'costs' | 'cashflow' | 'mrr' | 'customers';
const METRICS: { key: Metric; label: string }[] = [
  { key: 'revenue', label: 'Ricavi' },
  { key: 'costs', label: 'Costi' },
  { key: 'cashflow', label: 'Cash Flow' },
  { key: 'mrr', label: 'MRR' },
  { key: 'customers', label: 'Clienti' },
];

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: yMean - slope * xMean };
}

export default function ForecastingPage() {
  const locale = useAppLocale();
  const [metric, setMetric] = useState<Metric>('revenue');
  const [horizon, setHorizon] = useState<number>(6);
  const [revenueGrowthAdj, setRevenueGrowthAdj] = useState<number>(0); // % adjustment
  const [churnAdj, setChurnAdj] = useState<number>(4.2); // %
  const [toast, setToast] = useState<string | null>(null);

  const credits = 100;
  const canGenerate = credits >= 2;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['forecast-base'],
    queryFn: () => apiFetch<FinanceResp>('/api/analysis/financial?period=12m'),
  });

  const forecast = useMemo(() => {
    if (!data) return null;
    const series = data.series;
    const histLabels = series.map((s) => s.period);
    const values =
      metric === 'revenue'
        ? series.map((s) => s.revenue)
        : metric === 'costs'
          ? series.map((s) => s.costs)
          : metric === 'cashflow'
            ? series.map((s) => s.revenue - s.costs)
            : metric === 'mrr'
              ? series.map((s) => s.revenue * 0.55)
              : series.map((s) => Math.round(s.revenue / 5500)); // customers

    const { slope, intercept } = linearRegression(values);
    const last = values[values.length - 1] ?? 0;

    // Build projected periods: extend last period forward
    const lastDate = histLabels[histLabels.length - 1] || '2026-01';
    const [yyyy, mm] = lastDate.split('-').map(Number);

    // Apply user adjustment from sliders
    const churnFactor = 1 - (churnAdj - 4.2) / 100; // higher churn lowers projection
    const revenueAdjFactor = 1 + revenueGrowthAdj / 100;

    const points: { period: string; historical?: number; realistic?: number; optimistic?: number; pessimistic?: number }[] = [];
    series.forEach((s, idx) => {
      points.push({ period: s.period, historical: values[idx] });
    });

    for (let i = 1; i <= horizon; i++) {
      const idx = values.length - 1 + i;
      const baseProjection = (intercept + slope * idx) * (metric === 'revenue' ? revenueAdjFactor : 1);
      const churnAdjusted = metric === 'mrr' || metric === 'customers' ? baseProjection * churnFactor : baseProjection;
      const realistic = Math.max(0, churnAdjusted);
      const optimistic = realistic * 1.2;
      const pessimistic = realistic * 0.8;
      const futureMonth = mm + i;
      const period = `${yyyy + Math.floor((futureMonth - 1) / 12)}-${String(((futureMonth - 1) % 12) + 1).padStart(2, '0')}`;
      points.push({ period, realistic, optimistic, pessimistic });
    }
    // Connect last historical to first projection so the lines look continuous
    const lastHist = points.findIndex((p) => p.historical !== undefined && points[points.indexOf(p) + 1]?.realistic !== undefined);
    if (lastHist >= 0) {
      points[lastHist].realistic = last;
      points[lastHist].optimistic = last;
      points[lastHist].pessimistic = last;
    }
    return points;
  }, [data, metric, horizon, churnAdj, revenueGrowthAdj]);

  const formatV = (v: number) =>
    metric === 'customers' ? formatNumber(v, locale) : formatCurrency(v, locale);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Previsioni"
        subtitle="Forecast locale a 3/6/12 mesi con scenari ottimistico, realistico e pessimistico"
        actions={
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => {
              setToast(
                canGenerate
                  ? 'Modalità demo: forecast calcolato localmente (no AI). Connetti la chiave Anthropic per analisi avanzate.'
                  : 'Crediti insufficienti. Acquistane altri nelle Impostazioni > Fatturazione.',
              );
              setTimeout(() => setToast(null), 4500);
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
              canGenerate
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-800',
            )}
          >
            <Sparkles className="h-4 w-4" /> Genera previsione (2 crediti)
          </button>
        }
      />

      {toast && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {toast}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs uppercase text-muted-foreground">Metrica</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <label className="ml-4 text-xs uppercase text-muted-foreground">Orizzonte</label>
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value={3}>3 mesi</option>
            <option value={6}>6 mesi</option>
            <option value={12}>12 mesi</option>
          </select>
        </div>
      </Card>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !forecast ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader title="Forecast con scenari" description="Linee continue: storico. Tratteggio: previsione." />
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatV(v as number)} />
                <Tooltip formatter={(v: number) => formatV(v)} />
                <Legend />
                <Line type="monotone" dataKey="historical" name="Storico" stroke="#0f172a" strokeWidth={2} dot={false} className="dark:stroke-slate-100" />
                <Line type="monotone" dataKey="optimistic" name="Ottimistico" stroke="#10b981" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                <Line type="monotone" dataKey="realistic" name="Realistico" stroke="#6366f1" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                <Line type="monotone" dataKey="pessimistic" name="Pessimistico" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="What-if: crescita ricavi" />
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Quanto cambia il forecast se i ricavi crescessero del{' '}
              <span className="font-medium">{revenueGrowthAdj >= 0 ? '+' : ''}{revenueGrowthAdj}%</span>?
            </p>
            <input
              type="range"
              min={-30}
              max={30}
              step={1}
              value={revenueGrowthAdj}
              onChange={(e) => setRevenueGrowthAdj(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>-30%</span>
              <span>0</span>
              <span>+30%</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="What-if: churn rate" />
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cosa succede se il churn salisse al{' '}
              <span className="font-medium">{formatPercent(churnAdj, locale)}</span>?
            </p>
            <input
              type="range"
              min={0}
              max={15}
              step={0.1}
              value={churnAdj}
              onChange={(e) => setChurnAdj(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>5%</span>
              <span>15%</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Storico forecast generati" />
        <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
          <LineIcon className="mb-2 h-8 w-8 opacity-40" />
          Nessun forecast salvato ancora. I forecast generati con AI verranno mostrati qui.
        </div>
      </Card>
    </div>
  );
}
