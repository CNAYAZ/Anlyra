import { z } from 'zod';

export const WIDGET_TYPES = [
  'kpi',
  'line',
  'bar',
  'area',
  'pie',
  'radar',
  'gauge',
  'table',
  'funnel',
  'heatmap',
  'note',
  'ai',
  'forecast',
  'benchmark',
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

export const METRIC_KEYS = ['revenue', 'orders', 'customers', 'margin', 'churn', 'mrr', 'cac', 'ltv'] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export const PERIOD_KEYS = ['7d', '30d', '90d', '12m', 'ytd'] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

export const widgetConfigSchema = z.object({
  title: z.string().max(80).optional(),
  metric: z.enum(METRIC_KEYS).optional(),
  period: z.enum(PERIOD_KEYS).optional(),
  color: z.string().optional(),
  text: z.string().max(500).optional(),
});

export type WidgetConfig = z.infer<typeof widgetConfigSchema>;

export const widgetSchema = z.object({
  id: z.string(),
  type: z.enum(WIDGET_TYPES),
  config: widgetConfigSchema.default({}),
  layout: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
});

export type Widget = z.infer<typeof widgetSchema>;

export const dashboardSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  widgets: z.array(widgetSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Dashboard = z.infer<typeof dashboardSchema>;

export interface WidgetMeta {
  type: WidgetType;
  defaults: WidgetConfig;
  defaultSize: { w: number; h: number };
  configurable: Array<'title' | 'metric' | 'period' | 'color' | 'text'>;
}

export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  kpi: {
    type: 'kpi',
    defaults: { metric: 'revenue', period: '30d', color: '#3b82f6' },
    defaultSize: { w: 3, h: 4 },
    configurable: ['title', 'metric', 'period', 'color'],
  },
  line: {
    type: 'line',
    defaults: { metric: 'revenue', period: '30d', color: '#3b82f6' },
    defaultSize: { w: 6, h: 6 },
    configurable: ['title', 'metric', 'period', 'color'],
  },
  bar: {
    type: 'bar',
    defaults: { metric: 'orders', period: '30d', color: '#0d9488' },
    defaultSize: { w: 6, h: 6 },
    configurable: ['title', 'metric', 'period', 'color'],
  },
  area: {
    type: 'area',
    defaults: { metric: 'mrr', period: '12m', color: '#3b82f6' },
    defaultSize: { w: 6, h: 6 },
    configurable: ['title', 'metric', 'period', 'color'],
  },
  pie: {
    type: 'pie',
    defaults: { metric: 'revenue', period: '30d' },
    defaultSize: { w: 4, h: 6 },
    configurable: ['title', 'metric'],
  },
  radar: {
    type: 'radar',
    defaults: { color: '#0d9488' },
    defaultSize: { w: 4, h: 6 },
    configurable: ['title', 'color'],
  },
  gauge: {
    type: 'gauge',
    defaults: { metric: 'churn', color: '#16a34a' },
    defaultSize: { w: 3, h: 5 },
    configurable: ['title', 'metric', 'color'],
  },
  table: {
    type: 'table',
    defaults: { period: '30d' },
    defaultSize: { w: 6, h: 6 },
    configurable: ['title', 'period'],
  },
  funnel: {
    type: 'funnel',
    defaults: { color: '#3b82f6' },
    defaultSize: { w: 4, h: 6 },
    configurable: ['title', 'color'],
  },
  heatmap: {
    type: 'heatmap',
    defaults: { color: '#3b82f6' },
    defaultSize: { w: 6, h: 5 },
    configurable: ['title', 'color'],
  },
  note: {
    type: 'note',
    defaults: { text: '' },
    defaultSize: { w: 4, h: 4 },
    configurable: ['title', 'text'],
  },
  ai: {
    type: 'ai',
    defaults: { metric: 'revenue', period: '30d' },
    defaultSize: { w: 4, h: 5 },
    configurable: ['title', 'metric', 'period'],
  },
  forecast: {
    type: 'forecast',
    defaults: { metric: 'revenue', color: '#2563eb' },
    defaultSize: { w: 4, h: 5 },
    configurable: ['title', 'metric', 'color'],
  },
  benchmark: {
    type: 'benchmark',
    defaults: { metric: 'margin' },
    defaultSize: { w: 4, h: 5 },
    configurable: ['title', 'metric'],
  },
};
