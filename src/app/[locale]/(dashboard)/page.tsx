'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Activity, BarChart3, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState, KpiSkeleton } from '@/components/ui/state';
import { RevenueVsCostsChart } from '@/components/charts/revenue-vs-costs-chart';
import { CashflowAreaChart } from '@/components/charts/cashflow-area-chart';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import type { CategoryBreakdown, KpiSummary, MonthlySeriesPoint } from '@/lib/analysis/financial';

type FinanceResponse = {
  kpis: KpiSummary;
  series: MonthlySeriesPoint[];
  revenueByCategory: CategoryBreakdown[];
  costsByCategory: CategoryBreakdown[];
  cumulativeCash: { period: string; inflow: number; outflow: number; net: number; cumulative: number }[];
  customers?: { period: string; activeCustomers: number; newCustomers: number; churnedCustomers: number }[];
};

export default function OverviewPage() {
  const locale = useAppLocale();
  const t = useTranslations();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: () => apiFetch<FinanceResponse>('/api/analysis/financial?period=12m'),
  });

  const subtitle = t.has('pages.overview.subtitle') ? t('pages.overview.subtitle') : undefined;
  const title = t.has('pages.overview.title') ? t('pages.overview.title') : 'Overview';

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label="Ricavi (12m)"
              value={formatCurrency(data.kpis.totalRevenue, locale)}
              deltaPercent={data.kpis.momRevenueGrowth}
              icon={TrendingUp}
            />
            <KpiCard
              label="Costi (12m)"
              value={formatCurrency(data.kpis.totalCosts, locale)}
              deltaPercent={data.kpis.momCostGrowth}
              invertDelta
              icon={TrendingDown}
            />
            <KpiCard
              label="Margine netto"
              value={formatPercent(data.kpis.netMargin, locale)}
              deltaPercent={data.kpis.momNetMarginDelta}
              icon={Activity}
            />
            <KpiCard
              label="Cash disponibile"
              value={formatCurrency(data.kpis.cashAvailable, locale)}
              icon={Wallet}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label="MRR"
              value={formatCurrency(data.kpis.mrr, locale)}
              deltaPercent={data.kpis.momMrrDelta}
              icon={BarChart3}
            />
            <KpiCard
              label="Clienti attivi"
              value={formatNumber(data.kpis.activeCustomers, locale)}
              deltaPercent={data.kpis.momCustomersDelta}
            />
            <KpiCard label="ARPU" value={formatCurrency(data.kpis.arpu, locale)} />
            <KpiCard
              label="Burn / Runway"
              value={`${formatCurrency(data.kpis.burnRate, locale)} · ${formatNumber(data.kpis.cashRunway, locale, 1)} mesi`}
              icon={PiggyBank}
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
            <CardHeader title="Andamento ricavi vs costi" />
            <RevenueVsCostsChart data={data?.series ?? []} locale={locale} />
          </Card>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader title="Cash flow cumulato" />
            <CashflowAreaChart data={data?.cumulativeCash ?? []} locale={locale} />
          </Card>
        )}
      </div>
    </div>
  );
}
