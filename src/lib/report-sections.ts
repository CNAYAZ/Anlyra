/**
 * Only sections the PDF can ACTUALLY fill with real data. Three were removed
 * from this list (never from stored data — see the note on REPORT_SECTIONS):
 *   • top_customers  — no per-customer revenue attribution exists anywhere in
 *     the schema (CustomerStat is aggregate counts, not named customers).
 *   • churn_overview — same: only aggregate churnedCustomers counts exist, no
 *     real churn analysis is computed anywhere in the product.
 *   • benchmarks     — would need real industry averages; the app has no such
 *     data source (see CLAUDE.md on the synthetic Operations/Mercato engines).
 * These are not "sometimes missing data for this org" cases where a disabled
 * checkbox with "add data to unlock" would be honest — they are architecturally
 * absent for EVERY organization, today and for any org that will ever exist
 * with the current schema. Showing them (even disabled) would imply the gap is
 * about this org's data, which is not true. Removing them outright is the
 * honest choice; src/lib/reports/config.ts already dropped them silently when
 * building the PDF, so this only stops the builder from offering a checkbox
 * that always produced nothing.
 */
export type ReportSectionKey =
  | 'kpi_summary'
  | 'revenue_breakdown'
  | 'cost_breakdown'
  | 'cashflow_trend'
  | 'forecast_3m';

export type ReportSection = {
  key: ReportSectionKey;
  /** i18n key under reports.section* */
  labelKey: string;
  descKey: string;
  category: 'finance' | 'operations' | 'forecast';
};

export const REPORT_SECTIONS: ReportSection[] = [
  { key: 'kpi_summary',       labelKey: 'sectionKpiSummary',     descKey: 'sectionKpiSummaryDesc',     category: 'finance' },
  { key: 'revenue_breakdown', labelKey: 'sectionRevenue',        descKey: 'sectionRevenueDesc',        category: 'finance' },
  { key: 'cost_breakdown',    labelKey: 'sectionCosts',          descKey: 'sectionCostsDesc',          category: 'finance' },
  { key: 'cashflow_trend',    labelKey: 'sectionCashflow',       descKey: 'sectionCashflowDesc',       category: 'finance' },
  { key: 'forecast_3m',       labelKey: 'sectionForecast',       descKey: 'sectionForecastDesc',       category: 'forecast' },
];

export const REPORT_SCHEDULES = ['on_demand', 'weekly', 'monthly'] as const;
export type ReportSchedule = (typeof REPORT_SCHEDULES)[number];
