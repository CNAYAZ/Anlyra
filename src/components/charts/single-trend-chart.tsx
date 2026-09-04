'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { formatCurrencyCompact, formatMonth, type Locale } from '@/lib/utils';

export type TrendPoint = { period: string; value: number };

export function SingleTrendChart({
  data,
  locale,
  label,
  color = '#2563eb',
}: {
  data: TrendPoint[];
  locale: Locale;
  label: string;
  color?: string;
}) {
  const tc = useTranslations('common');
  // The LAST point is always the current, possibly-partial month (see
  // periodWindow in lib/analysis/financial.ts) — marked hollow instead of
  // filled, and called out in the tooltip, rather than letting it read as a
  // real decline just because it covers fewer days than the months before it.
  const lastIndex = data.length - 1;
  const formatted = data.map((p, i) => ({
    label: formatMonth(`${p.period}-01`, locale),
    value: p.value,
    isPartial: i === lastIndex,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
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
          formatter={(v: number) => [formatCurrencyCompact(v, locale), label]}
          labelFormatter={(lbl: string, payload) =>
            payload?.[0]?.payload?.isPartial ? `${lbl} (${tc('partialMonth')})` : lbl
          }
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={(props: { cx?: number; cy?: number; index?: number }) => {
            const { cx, cy, index } = props;
            if (cx === undefined || cy === undefined || index === undefined) return <g key="dot-empty" />;
            return formatted[index]?.isPartial ? (
              <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill="white" stroke={color} strokeWidth={2} />
            ) : (
              <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill={color} />
            );
          }}
          activeDot={{ r: 5 }}
          name={label}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
