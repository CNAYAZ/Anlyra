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
  const formatted = data.map((p) => ({ label: formatMonth(`${p.period}-01`, locale), value: p.value }));
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
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 5 }}
          name={label}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
