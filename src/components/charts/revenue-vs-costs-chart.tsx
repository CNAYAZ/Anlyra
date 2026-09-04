'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { formatCurrencyCompact, formatMonth, type Locale } from '@/lib/utils';

export type SeriesPoint = { period: string; revenue: number; costs: number };

function partialDot(color: string, formatted: { isPartial: boolean }[]) {
  return function PartialDot(props: { cx?: number; cy?: number; index?: number }) {
    const { cx, cy, index } = props;
    if (cx === undefined || cy === undefined || index === undefined) return <g key="dot-empty" />;
    return formatted[index]?.isPartial ? (
      <circle key={`dot-${color}-${index}`} cx={cx} cy={cy} r={4} fill="white" stroke={color} strokeWidth={2} />
    ) : (
      <circle key={`dot-${color}-${index}`} cx={cx} cy={cy} r={3} fill={color} />
    );
  };
}

export function RevenueVsCostsChart({ data, locale }: { data: SeriesPoint[]; locale: Locale }) {
  const t = useTranslations('overview.chart');
  const tc = useTranslations('common');
  // The LAST point is always the current, possibly-partial month (see
  // periodWindow in lib/analysis/financial.ts) — marked hollow instead of
  // filled, and called out in the tooltip, rather than letting it read as a
  // real decline just because it covers fewer days than the months before it.
  const lastIndex = data.length - 1;
  const formatted = data.map((p, i) => ({ ...p, label: formatMonth(`${p.period}-01`, locale), isPartial: i === lastIndex }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={(v) => formatCurrencyCompact(v, locale)}
        />
        <Tooltip
          formatter={(v: number) => formatCurrencyCompact(v, locale)}
          labelFormatter={(l: string, payload) =>
            payload?.[0]?.payload?.isPartial ? `${l} (${tc('partialMonth')})` : l
          }
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} />
        <Line
          type="monotone"
          dataKey="revenue"
          name={t('revenue')}
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={partialDot('#2563eb', formatted)}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="costs"
          name={t('costs')}
          stroke="#dc2626"
          strokeWidth={2.5}
          dot={partialDot('#dc2626', formatted)}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
