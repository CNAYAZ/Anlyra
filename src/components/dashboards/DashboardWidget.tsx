'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { Skeleton } from '@/components/ui/skeleton';
import { SingleTrendChart } from '@/components/charts/single-trend-chart';
import { CategoryBarChart } from '@/components/charts/category-bar-chart';
import { CashflowAreaChart } from '@/components/charts/cashflow-area-chart';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  catalogEntry,
  metricOf,
  periodOf,
  type WidgetConfig,
} from '@/lib/dashboard-widgets';
import type { Locale } from '@/lib/utils';

/**
 * Draws ONE saved widget with the organization's REAL data.
 *
 * ── WHERE THE DATA COMES FROM ──
 * No new endpoint was written: every widget here is served by a route that
 * already existed and already returns the right shape.
 *   • /api/analysis/financial   → kpis, series, costsByCategory, cumulativeCash,
 *                                 customers. Covers 7 of the 9 widget types.
 *   • /api/ai/forecasting       → historical + forecast (+ insufficientData)
 *   • /api/ai/benchmarks        → industry percentiles + this org's value
 * All three resolve the organization from the session themselves, so nothing
 * here needs — or is trusted with — an organizationId.
 *
 * React Query deduplicates by key, so a dashboard holding six financial widgets
 * on the same period makes ONE HTTP request, not six. That is why the period is
 * part of the key and the whole payload is fetched rather than a narrow slice
 * per widget.
 *
 * ── THE HONEST-EMPTY RULE ──
 * When the source table is empty this renders `emptyHintKey` — a sentence that
 * says what to do about it — and NEVER a placeholder number. The widget system
 * this replaces invented every figure it displayed; the whole point of the
 * rewrite is that a dashboard now either shows the user's own numbers or admits
 * it has none.
 */

type FinancialPayload = {
  kpis: {
    totalRevenue: number;
    totalCosts: number;
    grossMargin: number;
    activeCustomers: number;
  };
  series: { period: string; revenue: number; costs: number }[];
  revenueByCategory: { category: string; total: number; share: number }[];
  costsByCategory: { category: string; total: number; share: number }[];
  cumulativeCash: { period: string; inflow: number; outflow: number; net: number; cumulative: number }[];
  customers: { period: string; activeCustomers: number; newCustomers: number; churnedCustomers: number }[];
};

type ForecastPayload = {
  historical: { period: string; value: number }[];
  forecast: { period: string; value: number }[];
  insufficientData: boolean;
};

type BenchmarkPayload = {
  metrics: {
    key: string;
    companyValue: number | null;
    p25: number;
    p50: number;
    p75: number;
    unit: string;
  }[];
};

/** Shared frame so every widget has the same header, height and empty state. */
function Frame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex h-full flex-col gap-3">
      <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/**
 * The empty state. Deliberately explains the CAUSE and the FIX rather than
 * just saying "no data": a user looking at an empty widget needs to know it is
 * waiting for an import, not that the product is broken.
 */
function EmptyHint({ hint }: { hint: string }) {
  return (
    <div className="flex h-full min-h-[80px] flex-col items-center justify-center gap-1.5 text-center">
      <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** One big number plus its caption — the shape all four kpi_* widgets use. */
function KpiValue({ value, caption }: { value: string; caption?: string }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="font-heading text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

export function DashboardWidget({ widget }: { widget: WidgetConfig }) {
  const t = useTranslations('customDashboards');
  const locale = useAppLocale() as Locale;
  const entry = catalogEntry(widget.type);

  const period = periodOf(widget.config);
  const metric = metricOf(widget.config);

  // Which endpoint this widget needs. Only ONE of the three queries below is
  // ever enabled for a given widget.
  const kind = widget.type === 'forecast' ? 'forecast' : widget.type === 'benchmark' ? 'benchmark' : 'financial';

  const financial = useQuery({
    queryKey: ['dashboard-financial', period],
    queryFn: () => apiFetch<FinancialPayload>(`/api/analysis/financial?period=${period}`),
    enabled: kind === 'financial',
  });

  const forecast = useQuery({
    queryKey: ['dashboard-forecast', metric],
    queryFn: () => apiFetch<ForecastPayload>(`/api/ai/forecasting?metric=${metric}&horizon=6&model=exponential`),
    enabled: kind === 'forecast',
  });

  const benchmark = useQuery({
    queryKey: ['dashboard-benchmark'],
    queryFn: () => apiFetch<BenchmarkPayload>('/api/ai/benchmarks'),
    enabled: kind === 'benchmark',
  });

  const active = kind === 'financial' ? financial : kind === 'forecast' ? forecast : benchmark;

  // A widget type that is no longer in the catalogue (a dashboard saved when
  // 'list_top_customers' still existed, for instance). Saying so plainly beats
  // rendering nothing, which would look like a broken layout.
  if (!entry) {
    return (
      <Frame title={widget.title}>
        <EmptyHint hint={t('widgetRetired')} />
      </Frame>
    );
  }

  if (active.isLoading) {
    return (
      <Frame title={widget.title}>
        <Skeleton className="h-full min-h-[80px] w-full" />
      </Frame>
    );
  }

  if (active.isError) {
    return (
      <Frame title={widget.title}>
        <EmptyHint hint={t('widgetError')} />
      </Frame>
    );
  }

  const hint = t(entry.emptyHintKey as 'emptyHintFinancial');

  // ── Financial widgets ──────────────────────────────────────────────────
  if (kind === 'financial') {
    const d = financial.data;
    if (!d) return <Frame title={widget.title}><EmptyHint hint={hint} /></Frame>;

    // "No movements at all" gates chart_revenue_trend below, which — like the
    // Finance → Revenue page's own trend chart — always shows the FULL
    // available history regardless of the period picked. `series` is that
    // unfiltered history, so it is the right check for that one case only.
    const hasMovements = d.series.length > 0;

    // The three kpi_* widgets must NOT read d.kpis: that object is computed
    // from the single most recent month (`series.at(-1)`, see computeKpis in
    // lib/analysis/financial.ts) and is therefore the SAME number whatever
    // `period` is requested — the bug this fix addresses. revenueByCategory /
    // costsByCategory, by contrast, are built from the period-filtered
    // transaction set, so summing their categories gives the real total for
    // the selected window. Their presence is also the correct "any data this
    // period?" check — d.series being non-empty only proves history exists
    // SOMEWHERE, not within the chosen period.
    const periodRevenue = d.revenueByCategory.reduce((sum, c) => sum + c.total, 0);
    const periodCosts = d.costsByCategory.reduce((sum, c) => sum + c.total, 0);
    const periodMargin = periodRevenue > 0 ? ((periodRevenue - periodCosts) / periodRevenue) * 100 : 0;

    switch (widget.type) {
      case 'kpi_revenue':
        return (
          <Frame title={widget.title}>
            {d.revenueByCategory.length > 0
              ? <KpiValue value={formatCurrency(periodRevenue, locale)} caption={t(`period_${period}` as 'period_12m')} />
              : <EmptyHint hint={hint} />}
          </Frame>
        );
      case 'kpi_costs':
        return (
          <Frame title={widget.title}>
            {d.costsByCategory.length > 0
              ? <KpiValue value={formatCurrency(periodCosts, locale)} caption={t(`period_${period}` as 'period_12m')} />
              : <EmptyHint hint={hint} />}
          </Frame>
        );
      case 'kpi_margin':
        return (
          <Frame title={widget.title}>
            {periodRevenue > 0
              ? <KpiValue
                  value={`${formatNumber(periodMargin, locale, { maximumFractionDigits: 1 })}%`}
                  caption={t(`period_${period}` as 'period_12m')}
                />
              : <EmptyHint hint={hint} />}
          </Frame>
        );
      case 'kpi_customers': {
        // CustomerStat, not a derived figure: if nobody imported the counts
        // there is no honest number to show, so the hint explains the import.
        const latest = d.customers.at(-1);
        return (
          <Frame title={widget.title}>
            {latest
              ? <KpiValue value={formatNumber(latest.activeCustomers, locale)} caption={latest.period} />
              : <EmptyHint hint={hint} />}
          </Frame>
        );
      }
      case 'chart_revenue_trend':
        return (
          <Frame title={widget.title}>
            {hasMovements ? (
              <SingleTrendChart
                data={d.series.map((s) => ({ period: s.period, value: s.revenue }))}
                locale={locale}
                label={t('widgetKpiRevenue')}
              />
            ) : <EmptyHint hint={hint} />}
          </Frame>
        );
      case 'chart_costs_breakdown':
        return (
          <Frame title={widget.title}>
            {d.costsByCategory.length > 0
              ? <CategoryBarChart data={d.costsByCategory} locale={locale} />
              : <EmptyHint hint={hint} />}
          </Frame>
        );
      case 'chart_cashflow':
        return (
          <Frame title={widget.title}>
            {d.cumulativeCash.length > 0
              ? <CashflowAreaChart data={d.cumulativeCash} locale={locale} />
              : <EmptyHint hint={hint} />}
          </Frame>
        );
    }
  }

  // ── Forecast ───────────────────────────────────────────────────────────
  if (kind === 'forecast') {
    const d = forecast.data;
    // The route reports insufficientData itself when there are too few months
    // to project from — reused rather than second-guessed here.
    if (!d || d.insufficientData || d.historical.length === 0) {
      return <Frame title={widget.title}><EmptyHint hint={hint} /></Frame>;
    }
    // History and projection on one line; the projected points continue the
    // series so the reader sees where the measured data ends.
    const combined = [
      ...d.historical.map((p) => ({ period: p.period, value: p.value })),
      ...d.forecast.map((p) => ({ period: p.period, value: p.value })),
    ];
    return (
      <Frame title={widget.title}>
        <SingleTrendChart data={combined} locale={locale} label={t(`metric_${metric}` as 'metric_revenue')} />
      </Frame>
    );
  }

  // ── Benchmark ──────────────────────────────────────────────────────────
  const d = benchmark.data;
  // The benchmark route keys margin as 'grossMargin'; revenue and costs have no
  // industry percentile at all (they are absolute amounts, not comparable
  // ratios), so only margin resolves to a row.
  const row = d?.metrics.find((m) => m.key === 'grossMargin');
  if (!row || row.companyValue === null) {
    return <Frame title={widget.title}><EmptyHint hint={hint} /></Frame>;
  }
  return (
    <Frame title={widget.title}>
      <div className="flex h-full flex-col justify-center gap-2 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">{t('benchmarkYou')}</span>
          <span className="font-heading text-lg font-semibold tabular-nums">
            {formatNumber(row.companyValue, locale, { maximumFractionDigits: 1 })}%
          </span>
        </div>
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>{t('benchmarkMedian')}</span>
          <span className="tabular-nums">{formatNumber(row.p50, locale, { maximumFractionDigits: 1 })}%</span>
        </div>
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>{t('benchmarkTop')}</span>
          <span className="tabular-nums">{formatNumber(row.p75, locale, { maximumFractionDigits: 1 })}%</span>
        </div>
      </div>
    </Frame>
  );
}
