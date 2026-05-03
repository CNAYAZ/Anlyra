'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrencyCompact, type Locale } from '@/lib/utils';

export type CategoryRow = { category: string; total: number };

const COLORS = ['#2563eb', '#0d9488', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];

export function CategoryBarChart({
  data,
  locale,
  labelFormatter,
}: {
  data: CategoryRow[];
  locale: Locale;
  labelFormatter?: (key: string) => string;
}) {
  const rows = [...data]
    .sort((a, b) => b.total - a.total)
    .map((d) => ({ ...d, label: labelFormatter ? labelFormatter(d.category) : d.category }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} layout="vertical" margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrencyCompact(v, locale)}
        />
        <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={100} />
        <Tooltip
          formatter={(v: number) => formatCurrencyCompact(v, locale)}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {rows.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
