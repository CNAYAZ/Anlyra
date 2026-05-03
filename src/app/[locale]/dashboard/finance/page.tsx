'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CategoryBarChart } from '@/components/charts/category-bar-chart';
import { CashflowAreaChart } from '@/components/charts/cashflow-area-chart';
import { RevenueVsCostsChart } from '@/components/charts/revenue-vs-costs-chart';
import { KpiCard } from '@/components/ui/kpi-card';
import { PeriodFilter, type PeriodRange } from '@/components/ui/period-filter';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState, KpiSkeleton } from '@/components/ui/state';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { CategoryBreakdown, KpiSummary, MonthlySeriesPoint } from '@/lib/analysis/financial';

type FinanceResponse = {
  kpis: KpiSummary;
  series: MonthlySeriesPoint[];
  revenueByCategory: CategoryBreakdown[];
  costsByCategory: CategoryBreakdown[];
  cumulativeCash: { period: string; inflow: number; outflow: number; net: number; cumulative: number }[];
};

export default function FinancePage() {
  const locale = useAppLocale();
  const t = useTranslations('finance');
  const [range, setRange] = useState<PeriodRange>({ period: '12m' });

  const params = new URLSearchParams({
    period: range.period,
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['financial', 'finance', range],
    queryFn: () => apiFetch<FinanceResponse>(`/api/analysis/financial?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={<PeriodFilter value={range} onChange={setRange} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label={t('kpi.revenue')}
              value={formatCurrency(data.kpis.totalRevenue, locale)}
              deltaPercent={data.kpis.momRevenueGrowth}
            />
            <KpiCard
              label={t('kpi.costs')}
              value={formatCurrency(data.kpis.totalCosts, locale)}
              deltaPercent={data.kpis.momCostGrowth}
              invertDelta
            />
            <KpiCard label={t('kpi.grossMargin')} value={formatPercent(data.kpis.grossMargin, locale)} />
            <KpiCard label={t('kpi.operatingMargin')} value={formatPercent(data.kpis.operatingMargin, locale)} />
            <KpiCard
              label={t('kpi.netMargin')}
              value={formatPercent(data.kpis.netMargin, locale)}
              deltaPercent={data.kpis.momNetMarginDelta}
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
            <CardHeader title={t('chart.trend')} />
            <RevenueVsCostsChart data={data?.series ?? []} locale={locale} />
          </Card>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader title={t('chart.cashFlowArea')} />
            <CashflowAreaChart data={data?.cumulativeCash ?? []} locale={locale} />
          </Card>
        )}
      </div>

      <div>
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader title={t('chart.byCategory')} />
            <CategoryBarChart
              data={data?.revenueByCategory ?? []}
              locale={locale}
              labelFormatter={(k) => k.replace(/_/g, ' ')}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
