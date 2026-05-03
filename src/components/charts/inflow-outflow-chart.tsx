'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrencyCompact, formatMonth, type Locale } from '@/lib/utils';

export type InflowOutflowPoint = { period: string; inflow: number; outflow: number };

export function InflowOutflowChart({
  data,
  locale,
  inflowLabel,
  outflowLabel,
}: {
  data: InflowOutflowPoint[];
  locale: Locale;
  inflowLabel: string;
  outflowLabel: string;
}) {
  const formatted = data.map((p) => ({
    label: formatMonth(`${p.period}-01`, locale),
    inflow: p.inflow,
    outflow: -p.outflow,
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={(v) => formatCurrencyCompact(Math.abs(v), locale)}
        />
        <Tooltip
          formatter={(v: number) => formatCurrencyCompact(Math.abs(v), locale)}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} />
        <Bar dataKey="inflow" name={inflowLabel} fill="#16a34a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="outflow" name={outflowLabel} fill="#dc2626" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
