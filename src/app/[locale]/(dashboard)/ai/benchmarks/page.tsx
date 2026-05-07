'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { CheckCircle2, AlertTriangle, AlertOctagon, Sparkles } from 'lucide-react';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState } from '@/components/ui/state';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import {
  scoreCompany,
  type CompanyBenchmark,
} from '@/lib/benchmarks/sectors/saas';
import type { KpiSummary } from '@/lib/analysis/financial';

type FinanceResp = { kpis: KpiSummary };

function formatVal(b: CompanyBenchmark, value: number, locale: string) {
  if (b.unit === 'percent') return formatPercent(value, locale);
  if (b.unit === 'currency') return formatCurrency(value, locale);
  if (b.unit === 'ratio') return `${formatNumber(value, locale, 1)}x`;
  return formatNumber(value, locale);
}

const STATUS_TONE: Record<CompanyBenchmark['status'], string> = {
  good: 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300',
  warn: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  bad: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
};

function StatusIcon({ status }: { status: CompanyBenchmark['status'] }) {
  if (status === 'good') return <CheckCircle2 className="h-5 w-5" />;
  if (status === 'warn') return <AlertTriangle className="h-5 w-5" />;
  return <AlertOctagon className="h-5 w-5" />;
}

export default function BenchmarksPage() {
  const locale = useAppLocale();
  const [toast, setToast] = useState<string | null>(null);
  const credits = 100;
  const canAnalyze = credits >= 2;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['benchmarks-base'],
    queryFn: () => apiFetch<FinanceResp>('/api/analysis/financial?period=12m'),
  });

  const benchmarks: CompanyBenchmark[] = useMemo(() => {
    if (!data) return [];
    const k = data.kpis;
    return scoreCompany({
      grossMargin: k.grossMargin,
      revenueGrowthYoY: (k.momRevenueGrowth || 0) * 12,
      churnRate: 4.2, // from KPI table seed
      nps: 42,
      cac: 320,
      ltvCacRatio: 4800 / Math.max(1, 320),
      revenuePerEmployee: k.totalRevenue / 18,
      conversionRate: 2.8,
    });
  }, [data]);

  const radarData = benchmarks.map((b) => ({
    dimension: b.label,
    'TechFlow SRL': b.score,
    'Media settore': 50,
  }));

  const weak = benchmarks.filter((b) => b.status === 'bad');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Benchmark di settore"
        subtitle="Confronto TechFlow SRL vs medie del settore SaaS B2B"
        actions={
          <button
            type="button"
            disabled={!canAnalyze}
            onClick={() => {
              setToast(
                canAnalyze
                  ? 'Modalità demo: confronto con dati di settore precaricati. Connetti la chiave Anthropic per analisi avanzate.'
                  : 'Crediti insufficienti. Acquistane altri nelle Impostazioni > Fatturazione.',
              );
              setTimeout(() => setToast(null), 4500);
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
              canAnalyze
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-800',
            )}
          >
            <Sparkles className="h-4 w-4" /> Analizza benchmark (2 crediti)
          </button>
        }
      />

      {toast && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {toast}
        </div>
      )}

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <ChartSkeleton />
      ) : (
        <>
          <Card>
            <CardHeader title="Radar 8 dimensioni" description="Più si avvicina ai bordi, più siamo sopra la media settore" />
            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#cbd5e1" className="dark:stroke-slate-700" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="TechFlow SRL" dataKey="TechFlow SRL" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Radar name="Media settore" dataKey="Media settore" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {benchmarks.map((b) => (
              <div
                key={b.key}
                className={cn(
                  'rounded-lg border p-4 space-y-2',
                  STATUS_TONE[b.status],
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide">{b.label}</div>
                  <StatusIcon status={b.status} />
                </div>
                <div className="text-2xl font-semibold text-foreground">
                  {formatVal(b, b.ourValue, locale)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Mediana settore: <span className="font-medium">{formatVal(b, b.sectorMedian, locale)}</span>
                  <br />
                  Top quartile: {formatVal(b, b.sectorTopQuartile, locale)}
                </div>
              </div>
            ))}
          </div>

          {weak.length > 0 && (
            <Card>
              <CardHeader title="Suggerimenti per le metriche sotto media" />
              <ul className="space-y-3 text-sm">
                {weak.map((b) => (
                  <li key={b.key} className="rounded-lg border border-red-300/40 bg-red-500/5 p-3 dark:border-red-700/40">
                    <div className="font-medium text-foreground">{b.label}</div>
                    <p className="mt-1 text-muted-foreground">{b.suggestion}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
