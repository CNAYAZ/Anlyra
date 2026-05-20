'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  Globe,
  MessageSquare,
  PiggyBank,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState, KpiSkeleton } from '@/components/ui/state';
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

const QUICK_ACTIONS: { href: string; labelKey: string; icon: typeof BarChart3; tone: string }[] = [
  { href: '/finance', labelKey: 'finance', icon: BarChart3, tone: 'bg-primary-accent/10 text-primary-accent' },
  { href: '/market', labelKey: 'market', icon: Globe, tone: 'bg-secondary/10 text-secondary-foreground' },
  { href: '/operations', labelKey: 'operations', icon: Activity, tone: 'bg-success/10 text-success' },
  { href: '/ai/chat', labelKey: 'aiChat', icon: MessageSquare, tone: 'bg-warning/10 text-warning' },
];

export default function OverviewPage() {
  const locale = useAppLocale();
  const t = useTranslations('overview');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: () => apiFetch<FinanceResponse>('/api/analysis/financial?period=12m'),
  });

  const lastSeries = data?.series.slice(-1)[0];
  const aiSpotlight =
    data && data.kpis.netMargin > 0
      ? t('aiSpotlightSummary', {
          margin: formatPercent(data.kpis.netMargin, locale),
          burnRate: formatCurrency(data.kpis.burnRate, locale),
          runway: formatNumber(data.kpis.cashRunway, locale, 1),
        })
      : t('aiSpotlightLoading');

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label={t('kpi.revenue12m')}
              value={formatCurrency(data.kpis.totalRevenue, locale)}
              delta={toDelta(data.kpis.momRevenueGrowth, locale)}
              icon={TrendingUp}
            />
            <KpiCard
              label={t('kpi.costs12m')}
              value={formatCurrency(data.kpis.totalCosts, locale)}
              delta={toDelta(data.kpis.momCostGrowth, locale, true)}
              icon={TrendingDown}
            />
            <KpiCard
              label={t('kpi.netMargin')}
              value={formatPercent(data.kpis.netMargin, locale)}
              delta={toDelta(data.kpis.momNetMarginDelta, locale)}
            />
            <KpiCard
              label={t('kpi.cashAvailable')}
              value={formatCurrency(data.kpis.cashAvailable, locale)}
              icon={Wallet}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title={t('aiSpotlight')} />
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading || !data ? (
            <ChartSkeleton />
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div>
                  <div className="text-sm font-medium">{t('aiSpotlightBadge')}</div>
                  <p className="text-sm text-muted-foreground">{aiSpotlight}</p>
                </div>
              </div>
              {lastSeries && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs uppercase text-muted-foreground">{t('lastMonthRevenue')}</div>
                    <div className="mt-1 font-semibold">{formatCurrency(lastSeries.revenue, locale)}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs uppercase text-muted-foreground">{t('lastMonthCosts')}</div>
                    <div className="mt-1 font-semibold">{formatCurrency(lastSeries.costs, locale)}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs uppercase text-muted-foreground">{t('lastMonthNetProfit')}</div>
                    <div className="mt-1 font-semibold">{formatCurrency(lastSeries.netProfit, locale)}</div>
                  </div>
                </div>
              )}
              <Link
                href="/finance"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-accent hover:underline"
              >
                {t('goToFinance')} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={t('quickActions.title')} />
          <div className="grid grid-cols-1 gap-2">
            {QUICK_ACTIONS.map((qa) => {
              const Icon = qa.icon;
              return (
                <Link
                  key={qa.href}
                  href={qa.href}
                  className="group flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary-accent/40 hover:bg-muted/40"
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-lg ${qa.tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{t(`quickActions.${qa.labelKey}`)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label={t('kpi.mrr')}
              value={formatCurrency(data.kpis.mrr, locale)}
              delta={toDelta(data.kpis.momMrrDelta, locale)}
              icon={BarChart3}
            />
            <KpiCard
              label={t('kpi.activeCustomers')}
              value={formatNumber(data.kpis.activeCustomers, locale)}
              delta={toDelta(data.kpis.momCustomersDelta, locale)}
              icon={Users}
            />
            <KpiCard label="ARPU" value={formatCurrency(data.kpis.arpu, locale)} icon={Brain} />
            <KpiCard
              label={t('kpi.runwayLabel')}
              value={`${formatNumber(data.kpis.cashRunway, locale, 1)} ${t('kpi.months')}`}
              icon={PiggyBank}
            />
          </>
        )}
      </div>
    </div>
  );
}
