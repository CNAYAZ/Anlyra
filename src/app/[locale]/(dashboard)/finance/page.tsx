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
import type {
  CategoryBreakdown,
  KpiSummary,
  MonthlySeriesPoint,
  PeriodComparison,
  PeriodTotals,
} from '@/lib/analysis/financial';

type FinanceResponse = {
  kpis: KpiSummary;
  // Totals for the period the PeriodFilter above is set to, with the
  // equivalent period before it. Every card below reads these, never `kpis`
  // (which is the latest month alone — right for the Overview, which has no
  // filter, wrong for a page where the customer picks the range).
  periodKpis: PeriodTotals & PeriodComparison;
  series: MonthlySeriesPoint[];
  revenueByCategory: CategoryBreakdown[];
  costsByCategory: CategoryBreakdown[];
  cumulativeCash: { period: string; inflow: number; outflow: number; net: number; cumulative: number }[];
};

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

export default function FinancePage() {
  const locale = useAppLocale();
  const t = useTranslations('finance');
  const tc = useTranslations('common');
  // A missing comparison is stated, not hidden and not faked as 0%. It goes in
  // the subtitle rather than KpiCard's `empty` state because the value itself
  // IS available — `empty` blanks the whole card, which would throw away a
  // real total just because the period before it has nothing to compare with.
  const noComparison = (pct: number | null) =>
    pct === null ? tc('kpiNotAvailableNoPreviousPeriod') : undefined;
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
      <p className="-mt-4 text-xs text-muted-foreground">
        {tc('partialMonthNote')} {tc('periodComparisonNote')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label={t('kpi.revenue')}
              value={formatCurrency(data.periodKpis.revenue, locale)}
              delta={toDelta(data.periodKpis.revenueGrowth, locale)}
              subtitle={noComparison(data.periodKpis.revenueGrowth)}
            />
            <KpiCard
              label={t('kpi.costs')}
              value={formatCurrency(data.periodKpis.costs, locale)}
              delta={toDelta(data.periodKpis.costGrowth, locale, true)}
              subtitle={noComparison(data.periodKpis.costGrowth)}
            />
            <KpiCard
              label={t('kpi.grossMargin')}
              value={data.periodKpis.grossMargin !== null ? formatPercent(data.periodKpis.grossMargin, locale) : ''}
              state={data.periodKpis.grossMargin === null ? 'empty' : 'idle'}
              empty={{ message: tc('kpiNotAvailable'), hint: tc('kpiNotAvailableNoRevenue') }}
            />
            <KpiCard
              label={t('kpi.operatingMargin')}
              value={
                data.periodKpis.operatingMargin !== null
                  ? formatPercent(data.periodKpis.operatingMargin, locale)
                  : ''
              }
              state={data.periodKpis.operatingMargin === null ? 'empty' : 'idle'}
              empty={{ message: tc('kpiNotAvailable'), hint: tc('kpiNotAvailableNoRevenue') }}
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
