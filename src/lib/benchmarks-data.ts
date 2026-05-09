/**
 * Industry benchmark data — static reference values for 2024.
 *
 * Sources / inspiration:
 *  - OpenView "SaaS Benchmarks Report 2024" (churn, NDR, growth)
 *  - ChartMogul "SaaS Growth Benchmarks 2024" (MRR growth, LTV/CAC)
 *  - SaaS Capital Survey 2024 (gross margin, payback)
 *  - Stripe / Shopify retail reports 2024 (ecommerce margins, conversion)
 *  - PitchBook 2024 (marketplace take-rate, fintech metrics)
 *
 * Values are realistic medians / quartiles, not authoritative.
 * Lower is better for: churn, cacPayback. Higher is better for the rest.
 */

export type IndustryKey =
  | 'saas-b2b'
  | 'saas-b2c'
  | 'ecommerce'
  | 'marketplace'
  | 'fintech'
  | 'agency';

export type SizeKey = 'early' | 'growth' | 'scale';

export type MetricKey =
  | 'churnRate'
  | 'nps'
  | 'conversionRate'
  | 'grossMargin'
  | 'cacPayback'
  | 'ltvCacRatio'
  | 'mrrGrowthRate'
  | 'netDollarRetention';

export type Percentiles = { p25: number; p50: number; p75: number };

export type IndustryBenchmark = Record<MetricKey, Percentiles>;

export const METRIC_UNITS: Record<MetricKey, 'percent' | 'months' | 'ratio' | 'score'> = {
  churnRate: 'percent',
  nps: 'score',
  conversionRate: 'percent',
  grossMargin: 'percent',
  cacPayback: 'months',
  ltvCacRatio: 'ratio',
  mrrGrowthRate: 'percent',
  netDollarRetention: 'percent',
};

// "lower is better" set
export const METRIC_LOWER_IS_BETTER: Set<MetricKey> = new Set(['churnRate', 'cacPayback']);

export const INDUSTRY_BENCHMARKS: Record<IndustryKey, IndustryBenchmark> = {
  // SaaS B2B mid-market — recurring contracts, longer sales cycles
  'saas-b2b': {
    churnRate:          { p25: 2.5, p50: 4.5, p75: 7.0 },
    nps:                { p25: 25,  p50: 38,  p75: 55 },
    conversionRate:     { p25: 1.5, p50: 3.0, p75: 5.5 },
    grossMargin:        { p25: 65,  p50: 75,  p75: 82 },
    cacPayback:         { p25: 9,   p50: 14,  p75: 22 },
    ltvCacRatio:        { p25: 2.5, p50: 3.5, p75: 5.0 },
    mrrGrowthRate:      { p25: 3.0, p50: 6.0, p75: 12.0 },
    netDollarRetention: { p25: 95,  p50: 105, p75: 120 },
  },
  // SaaS B2C — higher churn, lower deal sizes, faster payback
  'saas-b2c': {
    churnRate:          { p25: 4.0, p50: 6.5, p75: 11.0 },
    nps:                { p25: 20,  p50: 32,  p75: 48 },
    conversionRate:     { p25: 2.0, p50: 4.0, p75: 7.5 },
    grossMargin:        { p25: 60,  p50: 70,  p75: 78 },
    cacPayback:         { p25: 6,   p50: 10,  p75: 16 },
    ltvCacRatio:        { p25: 2.0, p50: 3.0, p75: 4.2 },
    mrrGrowthRate:      { p25: 4.0, p50: 8.0, p75: 14.0 },
    netDollarRetention: { p25: 88,  p50: 96,  p75: 108 },
  },
  // Ecommerce — physical goods, lower margins, NDR via repeat
  'ecommerce': {
    churnRate:          { p25: 5.0, p50: 8.5, p75: 14.0 },
    nps:                { p25: 18,  p50: 30,  p75: 45 },
    conversionRate:     { p25: 1.4, p50: 2.5, p75: 3.8 },
    grossMargin:        { p25: 28,  p50: 40,  p75: 55 },
    cacPayback:         { p25: 4,   p50: 7,   p75: 12 },
    ltvCacRatio:        { p25: 1.8, p50: 2.8, p75: 4.0 },
    mrrGrowthRate:      { p25: 2.0, p50: 5.0, p75: 10.0 },
    netDollarRetention: { p25: 80,  p50: 92,  p75: 105 },
  },
  // Marketplace — take-rate based, network effects
  'marketplace': {
    churnRate:          { p25: 6.0, p50: 10.0, p75: 16.0 },
    nps:                { p25: 22,  p50: 35,  p75: 50 },
    conversionRate:     { p25: 1.0, p50: 2.0, p75: 3.5 },
    grossMargin:        { p25: 45,  p50: 60,  p75: 72 },
    cacPayback:         { p25: 5,   p50: 9,   p75: 15 },
    ltvCacRatio:        { p25: 2.2, p50: 3.2, p75: 4.5 },
    mrrGrowthRate:      { p25: 3.5, p50: 7.0, p75: 13.0 },
    netDollarRetention: { p25: 85,  p50: 95,  p75: 110 },
  },
  // Fintech — high margins, regulatory complexity, slow CAC payback
  'fintech': {
    churnRate:          { p25: 1.5, p50: 3.0, p75: 5.5 },
    nps:                { p25: 28,  p50: 42,  p75: 58 },
    conversionRate:     { p25: 1.8, p50: 3.5, p75: 6.0 },
    grossMargin:        { p25: 70,  p50: 80,  p75: 88 },
    cacPayback:         { p25: 12,  p50: 18,  p75: 28 },
    ltvCacRatio:        { p25: 3.0, p50: 4.5, p75: 6.5 },
    mrrGrowthRate:      { p25: 4.0, p50: 8.0, p75: 15.0 },
    netDollarRetention: { p25: 100, p50: 112, p75: 128 },
  },
  // Agency / professional services — project-based, high margins, low NDR
  'agency': {
    churnRate:          { p25: 8.0, p50: 14.0, p75: 22.0 },
    nps:                { p25: 30,  p50: 45,  p75: 60 },
    conversionRate:     { p25: 8.0, p50: 15.0, p75: 25.0 }, // proposal-to-close
    grossMargin:        { p25: 35,  p50: 50,  p75: 65 },
    cacPayback:         { p25: 3,   p50: 6,   p75: 10 },
    ltvCacRatio:        { p25: 1.5, p50: 2.5, p75: 4.0 },
    mrrGrowthRate:      { p25: 1.0, p50: 3.0, p75: 7.0 },
    netDollarRetention: { p25: 70,  p50: 85,  p75: 100 },
  },
};

/**
 * Size-based adjustment multipliers applied to each percentile.
 * Early-stage companies typically have higher churn / lower margins;
 * scale-stage companies have the opposite.
 */
type SizeAdjustment = Partial<Record<MetricKey, number>>;

const SIZE_ADJUSTMENTS: Record<SizeKey, SizeAdjustment> = {
  early: {
    churnRate: 1.30,           // higher churn
    grossMargin: 0.92,         // lower margins
    cacPayback: 1.20,          // longer payback
    netDollarRetention: 0.95,
    ltvCacRatio: 0.90,
  },
  growth: {
    // baseline: no adjustment
  },
  scale: {
    churnRate: 0.80,
    grossMargin: 1.05,
    cacPayback: 0.90,
    netDollarRetention: 1.05,
    ltvCacRatio: 1.10,
  },
};

export function getBenchmark(industry: IndustryKey, size: SizeKey): IndustryBenchmark {
  const base = INDUSTRY_BENCHMARKS[industry];
  const adj = SIZE_ADJUSTMENTS[size];
  const result: Partial<IndustryBenchmark> = {};

  for (const key of Object.keys(base) as MetricKey[]) {
    const factor = adj[key] ?? 1;
    const p = base[key];
    result[key] = {
      p25: round(p.p25 * factor),
      p50: round(p.p50 * factor),
      p75: round(p.p75 * factor),
    };
  }
  return result as IndustryBenchmark;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Status assignment for a company value vs industry percentiles.
 * Handles both "higher is better" and "lower is better" metrics.
 */
export type BenchmarkStatus = 'excellent' | 'good' | 'average' | 'below' | 'critical';

export function statusFor(metric: MetricKey, value: number, p: Percentiles): BenchmarkStatus {
  const lowerBetter = METRIC_LOWER_IS_BETTER.has(metric);
  if (lowerBetter) {
    if (value <= p.p25) return 'excellent';
    if (value <= p.p50) return 'good';
    if (value <= p.p75) return 'average';
    if (value <= p.p75 * 1.3) return 'below';
    return 'critical';
  }
  if (value >= p.p75) return 'excellent';
  if (value >= p.p50) return 'good';
  if (value >= p.p25) return 'average';
  if (value >= p.p25 * 0.7) return 'below';
  return 'critical';
}

export const ALL_INDUSTRIES: IndustryKey[] = ['saas-b2b', 'saas-b2c', 'ecommerce', 'marketplace', 'fintech', 'agency'];
export const ALL_SIZES: SizeKey[] = ['early', 'growth', 'scale'];
export const ALL_METRICS: MetricKey[] = [
  'churnRate', 'nps', 'conversionRate', 'grossMargin',
  'cacPayback', 'ltvCacRatio', 'mrrGrowthRate', 'netDollarRetention',
];
