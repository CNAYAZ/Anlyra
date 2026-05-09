export type ReportSectionKey =
  | 'kpi_summary'
  | 'revenue_breakdown'
  | 'cost_breakdown'
  | 'cashflow_trend'
  | 'top_customers'
  | 'churn_overview'
  | 'forecast_3m'
  | 'benchmarks';

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
  { key: 'top_customers',     labelKey: 'sectionTopCustomers',   descKey: 'sectionTopCustomersDesc',   category: 'operations' },
  { key: 'churn_overview',    labelKey: 'sectionChurn',          descKey: 'sectionChurnDesc',          category: 'operations' },
  { key: 'forecast_3m',       labelKey: 'sectionForecast',       descKey: 'sectionForecastDesc',       category: 'forecast' },
  { key: 'benchmarks',        labelKey: 'sectionBenchmarks',     descKey: 'sectionBenchmarksDesc',     category: 'forecast' },
];

export const REPORT_SCHEDULES = ['on_demand', 'weekly', 'monthly'] as const;
export type ReportSchedule = (typeof REPORT_SCHEDULES)[number];
