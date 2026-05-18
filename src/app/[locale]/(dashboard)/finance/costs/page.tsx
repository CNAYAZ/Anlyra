'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { TrendingDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CategoryBarChart } from '@/components/charts/category-bar-chart';
import { SingleTrendChart } from '@/components/charts/single-trend-chart';
import { CategoryFilter } from '@/components/ui/category-filter';
import { KpiCard } from '@/components/ui/kpi-card';
import { PeriodFilter, type PeriodRange } from '@/components/ui/period-filter';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState, KpiSkeleton } from '@/components/ui/state';
import { TransactionsTable, type SortKey, type SortOrder } from '@/components/ui/transactions-table';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { CategoryBreakdown, MonthlySeriesPoint } from '@/lib/analysis/financial';

type CostsResponse = {
  kpis: { totalCosts: number; burnRate: number; ratio: number };
  series: MonthlySeriesPoint[];
  byCategory: CategoryBreakdown[];
  categories: string[];
  items: { id: string; date: string; category: string; amount: number; description: string; source: string }[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
};

export default function CostsPage() {
  const locale = useAppLocale();
  const t = useTranslations('costs');

  const [range, setRange] = useState<PeriodRange>({ period: '12m' });
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const params = new URLSearchParams({
    period: range.period,
    page: String(page),
    pageSize: '20',
    sortBy,
    sortOrder,
    ...(category ? { category } : {}),
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['costs', range, category, page, sortBy, sortOrder],
    queryFn: () => apiFetch<CostsResponse>(`/api/analysis/financial/costs?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(key);
      setSortOrder('desc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={<PeriodFilter value={range} onChange={(v) => { setRange(v); setPage(1); }} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label={t('kpi.total')}
              value={formatCurrency(data.kpis.totalCosts, locale)}
              icon={TrendingDown}
            />
            <KpiCard label={t('kpi.burnRate')} value={formatCurrency(data.kpis.burnRate, locale)} />
            <KpiCard
              label={t('kpi.ratio')}
              value={formatPercent(data.kpis.ratio, locale)}
              tone={data.kpis.ratio < 70 ? 'positive' : data.kpis.ratio < 90 ? 'neutral' : 'negative'}
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
            <CardHeader title={t('chart.byCategory')} />
            <CategoryBarChart
              data={data?.byCategory ?? []}
              locale={locale}
              labelFormatter={(k) => k.replace(/_/g, ' ')}
            />
          </Card>
        )}
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader title={t('chart.trend')} />
            <SingleTrendChart
              data={(data?.series ?? []).map((s) => ({ period: s.period, value: s.costs }))}
              locale={locale}
              label={t('kpi.total')}
              color="#dc2626"
            />
          </Card>
        )}
      </div>

      <Card className="p-0">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <h3 className="font-heading font-semibold text-base">{t('table.title')}</h3>
          <CategoryFilter
            value={category}
            onChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
            categories={data?.categories ?? []}
          />
        </div>
        <TransactionsTable
          rows={data?.items ?? []}
          locale={locale}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          page={page}
          pageSize={data?.pagination.pageSize ?? 20}
          total={data?.pagination.total ?? 0}
          totalPages={data?.pagination.totalPages ?? 0}
          onPageChange={setPage}
          amountTone="negative"
        />
      </Card>
    </div>
  );
}
