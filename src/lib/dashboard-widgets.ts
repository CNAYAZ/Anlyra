export type WidgetType =
  | 'kpi_revenue'
  | 'kpi_costs'
  | 'kpi_margin'
  | 'kpi_customers'
  | 'chart_revenue_trend'
  | 'chart_costs_breakdown'
  | 'chart_cashflow'
  | 'list_top_customers';

export type WidgetConfig = {
  id: string;
  type: WidgetType;
  title: string;
  config?: Record<string, unknown>;
};

export type WidgetCatalogEntry = {
  type: WidgetType;
  /** i18n key under customDashboards.widget* */
  labelKey: string;
  descKey: string;
  category: 'kpi' | 'chart' | 'list';
};

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  { type: 'kpi_revenue',         labelKey: 'widgetKpiRevenue',         descKey: 'widgetKpiRevenueDesc',         category: 'kpi' },
  { type: 'kpi_costs',           labelKey: 'widgetKpiCosts',           descKey: 'widgetKpiCostsDesc',           category: 'kpi' },
  { type: 'kpi_margin',          labelKey: 'widgetKpiMargin',          descKey: 'widgetKpiMarginDesc',          category: 'kpi' },
  { type: 'kpi_customers',       labelKey: 'widgetKpiCustomers',       descKey: 'widgetKpiCustomersDesc',       category: 'kpi' },
  { type: 'chart_revenue_trend', labelKey: 'widgetChartRevenueTrend',  descKey: 'widgetChartRevenueTrendDesc',  category: 'chart' },
  { type: 'chart_costs_breakdown', labelKey: 'widgetChartCosts',       descKey: 'widgetChartCostsDesc',         category: 'chart' },
  { type: 'chart_cashflow',      labelKey: 'widgetChartCashflow',      descKey: 'widgetChartCashflowDesc',      category: 'chart' },
  { type: 'list_top_customers',  labelKey: 'widgetListTopCustomers',   descKey: 'widgetListTopCustomersDesc',   category: 'list' },
];
