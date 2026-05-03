'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrencyCompact, formatMonth, type Locale } from '@/lib/utils';

export type CashflowPoint = { period: string; cumulative: number; inflow: number; outflow: number };

export function CashflowAreaChart({ data, locale }: { data: CashflowPoint[]; locale: Locale }) {
  const formatted = data.map((p) => ({
    ...p,
    label: formatMonth(`${p.period}-01`, locale),
    positive: Math.max(0, p.cumulative),
    negative: Math.min(0, p.cumulative),
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cfPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="cfNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity={0} />
            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.5} />
          </linearGradient>
        </defs>
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
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <ReferenceLine y={0} stroke="rgba(100,116,139,0.4)" />
        <Area type="monotone" dataKey="positive" stroke="#16a34a" fill="url(#cfPos)" strokeWidth={2} />
        <Area type="monotone" dataKey="negative" stroke="#dc2626" fill="url(#cfNeg)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
