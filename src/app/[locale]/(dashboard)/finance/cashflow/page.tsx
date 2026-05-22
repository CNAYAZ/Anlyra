'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CategoryBarChart } from '@/components/charts/category-bar-chart';
import { InflowOutflowChart } from '@/components/charts/inflow-outflow-chart';
import { KpiCard } from '@/components/ui/kpi-card';
import { PeriodFilter, type PeriodRange } from '@/components/ui/period-filter';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState, KpiSkeleton } from '@/components/ui/state';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { formatCurrency, formatNumber } from '@/lib/utils';

type CashflowResponse = {
  kpis: { operating: number; available: number; workingCapital: number; runway: number };
  monthly: { period: string; inflow: number; outflow: number; net: number; cumulative: number }[];
  byCategory: { category: string; inflow: number; outflow: number; net: number }[];
};

export default function CashflowPage() {
  const locale = useAppLocale();
  const t = useTranslations('cashflow');
  const tUnits = useTranslations('units');

  const [range, setRange] = useState<PeriodRange>({ period: '12m' });

  const params = new URLSearchParams({
    period: range.period,
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cashflow', range],
    queryFn: () => apiFetch<CashflowResponse>(`/api/analysis/financial/cashflow?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={<PeriodFilter value={range} onChange={setRange} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label={t('kpi.operating')}
              value={formatCurrency(data.kpis.operating, locale)}
            />
            <KpiCard label={t('kpi.available')} value={formatCurrency(data.kpis.available, locale)} />
            <KpiCard label={t('kpi.workingCapital')} value={formatCurrency(data.kpis.workingCapital, locale)} />
            <KpiCard
              label={t('kpi.runway')}
              value={formatNumber(data.kpis.runway, locale, 1)}
              unit={{ suffix: tUnits('months') }}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {isLoading ? (
          <ChartSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <Card>
            <CardHeader title={t('chart.inflowOutflow')} />
            <InflowOutflowChart
              data={data?.monthly ?? []}
              locale={locale}
              inflowLabel={t('chart.inflow')}
              outflowLabel={t('chart.outflow')}
            />
          </Card>
        )}
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader title={t('chart.byCategory')} />
            <CategoryBarChart
              data={(data?.byCategory ?? []).map((c) => ({ category: c.category, total: c.net }))}
              locale={locale}
              labelFormatter={(k) => k.replace(/_/g, ' ')}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
