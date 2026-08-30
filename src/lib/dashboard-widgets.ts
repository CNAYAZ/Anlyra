/**
 * The Custom Dashboards widget catalogue.
 *
 * ── THE RULE THIS FILE ENFORCES ──
 * A widget only exists here if there is a REAL source for it in the database.
 * Nothing in a dashboard is ever invented: when the underlying table is empty
 * the widget says so and explains what to do about it (see EMPTY_HINT_KEY), it
 * does not fall back to a plausible-looking number.
 *
 * That is why the previous synthetic widget system was removed wholesale, and
 * why these types are gone from the catalogue:
 *   • list_top_customers — no named-customer table exists. The only names are
 *     in Receivable, which would make it "top customers by OUTSTANDING DEBT" —
 *     a different statement from what the title promises. Founder's call: out.
 *   • orders / cac / ltv / mrr — no table holds them (no orders model; MRR only
 *     lives in Subscription, which has no user-facing write path at all).
 *   • funnel / heatmap / radar / product table — would need lead tracking,
 *     per-hour timestamps and per-area scores that this product does not
 *     collect. Not a wiring problem: the data does not exist.
 */

export type WidgetType =
  | 'kpi_revenue'
  | 'kpi_costs'
  | 'kpi_margin'
  | 'kpi_customers'
  | 'chart_revenue_trend'
  | 'chart_costs_breakdown'
  | 'chart_cashflow'
  | 'forecast'
  | 'benchmark';

/**
 * Time window a widget covers.
 *
 * These are EXACTLY the values periodSchema in lib/api/financial-query.ts
 * accepts ('1m' | '3m' | '6m' | '12m'), minus 'custom' which needs explicit
 * from/to dates the builder does not collect. Inventing a nicer-looking set
 * here (an 'all' option, say) would produce a 422 from the very route the
 * widget calls.
 */
export const WIDGET_PERIODS = ['1m', '3m', '6m', '12m'] as const;
export type WidgetPeriod = (typeof WIDGET_PERIODS)[number];

/** Metric for the widgets that can show more than one (forecast, benchmark). */
export const WIDGET_METRICS = ['revenue', 'costs', 'margin'] as const;
export type WidgetMetric = (typeof WIDGET_METRICS)[number];

/**
 * Per-widget options chosen in the builder and stored inside the dashboard's
 * JSON. Every field is OPTIONAL on purpose: dashboards saved before this
 * existed carry `{id, type, title}` and nothing else, and must keep working.
 * Readers apply DEFAULT_PERIOD / DEFAULT_METRIC when a field is absent, so an
 * old row renders exactly like a new one left at its defaults.
 */
export type WidgetOptions = {
  period?: WidgetPeriod;
  metric?: WidgetMetric;
};

export type WidgetConfig = {
  id: string;
  type: WidgetType;
  title: string;
  config?: WidgetOptions;
};

export const DEFAULT_PERIOD: WidgetPeriod = '12m';
export const DEFAULT_METRIC: WidgetMetric = 'revenue';

export type WidgetCatalogEntry = {
  type: WidgetType;
  /** i18n key under customDashboards.widget* */
  labelKey: string;
  descKey: string;
  category: 'kpi' | 'chart' | 'analysis';
  /** Which options the builder should offer for this type. */
  options: Array<'period' | 'metric'>;
  /**
   * i18n key (under customDashboards.empty*) explaining what to do when this
   * widget's source table is empty. Every widget must have one: "no data" on
   * its own leaves the user stuck.
   */
  emptyHintKey: string;
};

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  // ── FinancialRecord: written by CSV import and manual entry. The source
  //    most organizations actually populate. ──
  { type: 'kpi_revenue',  labelKey: 'widgetKpiRevenue',  descKey: 'widgetKpiRevenueDesc',
    category: 'kpi', options: ['period'], emptyHintKey: 'emptyHintFinancial' },
  { type: 'kpi_costs',    labelKey: 'widgetKpiCosts',    descKey: 'widgetKpiCostsDesc',
    category: 'kpi', options: ['period'], emptyHintKey: 'emptyHintFinancial' },
  { type: 'kpi_margin',   labelKey: 'widgetKpiMargin',   descKey: 'widgetKpiMarginDesc',
    category: 'kpi', options: ['period'], emptyHintKey: 'emptyHintFinancial' },

  // ── CustomerStat: real user paths exist (import + manual) but few
  //    organizations fill it in, so the empty state has to be genuinely
  //    helpful rather than a shrug. ──
  { type: 'kpi_customers', labelKey: 'widgetKpiCustomers', descKey: 'widgetKpiCustomersDesc',
    category: 'kpi', options: [], emptyHintKey: 'emptyHintCustomers' },

  { type: 'chart_revenue_trend',   labelKey: 'widgetChartRevenueTrend', descKey: 'widgetChartRevenueTrendDesc',
    category: 'chart', options: ['period'], emptyHintKey: 'emptyHintFinancial' },
  { type: 'chart_costs_breakdown', labelKey: 'widgetChartCosts',        descKey: 'widgetChartCostsDesc',
    category: 'chart', options: ['period'], emptyHintKey: 'emptyHintFinancial' },
  // Cashflow reads CashflowEntry, falling back to a 1:1 derivation from the
  // monthly movement totals (see financial-query.ts) — so it works for anyone
  // who has movements, even with CashflowEntry empty.
  { type: 'chart_cashflow',        labelKey: 'widgetChartCashflow',     descKey: 'widgetChartCashflowDesc',
    category: 'chart', options: [], emptyHintKey: 'emptyHintFinancial' },

  // ── Existing engines, reused as-is. ──
  { type: 'forecast',  labelKey: 'widgetForecast',  descKey: 'widgetForecastDesc',
    category: 'analysis', options: ['metric'], emptyHintKey: 'emptyHintForecast' },
  // No metric option ON PURPOSE: of the three metrics offered elsewhere, only
  // margin has an industry percentile to compare against (revenue and costs are
  // absolute amounts — "your revenue vs the industry's" is not a meaningful
  // comparison without company size). Offering a selector whose other choices
  // silently showed the margin anyway would be a lie in the interface.
  { type: 'benchmark', labelKey: 'widgetBenchmark', descKey: 'widgetBenchmarkDesc',
    category: 'analysis', options: [], emptyHintKey: 'emptyHintFinancial' },
];

/** Catalogue entry for a stored widget, or undefined for a type no longer offered. */
export function catalogEntry(type: string): WidgetCatalogEntry | undefined {
  return WIDGET_CATALOG.find((w) => w.type === type);
}

/** The period to send to the API, applying the default for older saved widgets. */
export function periodOf(config: WidgetOptions | undefined): WidgetPeriod {
  return config?.period ?? DEFAULT_PERIOD;
}

/** The metric to use, applying the default for older saved widgets. */
export function metricOf(config: WidgetOptions | undefined): WidgetMetric {
  return config?.metric ?? DEFAULT_METRIC;
}
