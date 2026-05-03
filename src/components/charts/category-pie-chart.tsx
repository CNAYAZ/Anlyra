'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrencyCompact, type Locale } from '@/lib/utils';

const COLORS = ['#2563eb', '#0d9488', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];

export type PieRow = { category: string; total: number };

export function CategoryPieChart({
  data,
  locale,
  labelFormatter,
}: {
  data: PieRow[];
  locale: Locale;
  labelFormatter?: (k: string) => string;
}) {
  const rows = data.map((d) => ({ ...d, label: labelFormatter ? labelFormatter(d.category) : d.category }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Tooltip
          formatter={(v: number) => formatCurrencyCompact(v, locale)}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} />
        <Pie
          data={rows}
          dataKey="total"
          nameKey="label"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {rows.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
