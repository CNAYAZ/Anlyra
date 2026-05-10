'use client';

import { useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BenchmarkStatus, MetricKey } from '@/lib/benchmarks-data';

const METRIC_LABEL_KEY: Record<MetricKey, string> = {
  churnRate: 'metricChurn',
  nps: 'metricNps',
  conversionRate: 'metricConversion',
  grossMargin: 'metricGrossMargin',
  cacPayback: 'metricCacPayback',
  ltvCacRatio: 'metricLtvCac',
  mrrGrowthRate: 'metricMrrGrowth',
  netDollarRetention: 'metricNdr',
};

const STATUS_COLOR: Record<BenchmarkStatus, string> = {
  excellent: 'hsl(var(--success))',
  good: 'hsl(var(--success))',
  average: 'hsl(var(--warning))',
  below: 'hsl(var(--warning))',
  critical: 'hsl(var(--danger))',
};

type Metric = {
  key: MetricKey;
  companyValue: number | null;
  p25: number;
  p50: number;
  p75: number;
  status: BenchmarkStatus | null;
};

type Props = {
  metrics: Metric[];
};

export function BenchmarkChart({ metrics }: Props) {
  const t = useTranslations('benchmarks');

  // Normalize: each metric's value is shown as % of the p50 baseline (=100%)
  // This lets us put 8 different scales on the same chart sensibly.
  const data = metrics
    .filter((m) => m.companyValue !== null && m.p50 > 0)
    .map((m) => {
      const ratio = ((m.companyValue ?? 0) / m.p50) * 100;
      return {
        label: t(METRIC_LABEL_KEY[m.key]),
        value: Math.round(ratio),
        status: m.status ?? 'average',
        rawValue: m.companyValue,
        p50: m.p50,
      };
    });

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        {t('empty')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={70}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(v) => `${v}%`}
          domain={[0, (dataMax: number) => Math.max(150, Math.ceil(dataMax / 25) * 25)]}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            fontSize: 12,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
          }}
          formatter={(_v: number, _n: string, item: { payload?: { rawValue: number; p50: number } }) => {
            const p = item.payload;
            if (!p) return ['—', ''];
            return [`${p.rawValue} (${t('percentile50')}: ${p.p50})`, ''];
          }}
        />
        {/* Reference: 100% line = industry median */}
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={STATUS_COLOR[entry.status as BenchmarkStatus]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
