'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { ForecastChart } from '@/components/ai/forecasting/forecast-chart';
import { ForecastMetrics } from '@/components/ai/forecasting/forecast-metrics';
import { ForecastControls, type ForecastControlValues } from '@/components/ai/forecasting/forecast-controls';
import { ForecastTable } from '@/components/ai/forecasting/forecast-table';
import { PageHeader } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/fetcher';
import { usePlan } from '@/lib/billing/context';
import type { ForecastSummary } from '@/lib/forecasting';
import type { HistoricalPoint, ForecastPoint } from '@/components/ai/forecasting/forecast-chart';
import type { Locale } from '@/lib/utils';

type ForecastResponse = {
  historical: HistoricalPoint[];
  forecast: ForecastPoint[];
  summary: ForecastSummary | null;
  insufficientData: boolean;
};

export default function ForecastingPage() {
  const t = useTranslations('forecasting');
  const { aiCreditsBalance } = usePlan();
  const locale = useLocale() as Locale;

  const [controls, setControls] = useState<ForecastControlValues>({
    metric: 'revenue',
    horizon: '6',
    model: 'exponential',
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const canGenerateAi = aiCreditsBalance >= 5;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['forecasting', controls.metric, controls.horizon, controls.model],
    queryFn: () =>
      apiFetch<ForecastResponse>(
        `/api/ai/forecasting?metric=${controls.metric}&horizon=${controls.horizon}&model=${controls.model}`,
      ),
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const historical = data?.historical ?? [];
  const forecast = data?.forecast ?? [];
  const summary = data?.summary ?? null;
  const insufficientData = data?.insufficientData ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <Calculator className="h-4 w-4" />
              {t('calculate')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!canGenerateAi}
              onClick={() => showToast(t('generateAiDisabled'))}
              title={!canGenerateAi ? t('creditsRequired') : undefined}
            >
              <Sparkles className="h-4 w-4" />
              {t('generateAi')}
            </Button>
          </div>
        }
      />

      {toastMsg && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm text-foreground">
          {toastMsg}
        </div>
      )}

      {/* Controls */}
      <div className="card">
        <ForecastControls values={controls} onChange={setControls} />
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <>
          {/* Metric skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          {/* Chart skeleton */}
          <Skeleton className="h-[340px]" />
          {/* Table skeleton */}
          <Skeleton className="h-48" />
        </>
      ) : insufficientData || historical.length < 3 ? (
        <EmptyState message={t('insufficientData')} />
      ) : (
        <>
          {/* Metrics */}
          {summary && <ForecastMetrics summary={summary} locale={locale} />}

          {/* Chart */}
          <div className="card">
            <ForecastChart
              historical={historical}
              forecast={forecast}
              locale={locale}
              height={340}
            />
          </div>

          {/* Table */}
          <ForecastTable historical={historical} forecast={forecast} locale={locale} />
        </>
      )}
    </div>
  );
}
