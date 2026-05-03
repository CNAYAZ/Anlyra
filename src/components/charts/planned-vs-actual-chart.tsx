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
import { formatCurrencyCompact, type Locale } from '@/lib/utils';

export type BudgetRow = { category: string; planned: number; actual: number };

export function PlannedVsActualChart({
  data,
  locale,
  plannedLabel,
  actualLabel,
  labelFormatter,
}: {
  data: BudgetRow[];
  locale: Locale;
  plannedLabel: string;
  actualLabel: string;
  labelFormatter?: (k: string) => string;
}) {
  const rows = data.map((d) => ({ ...d, label: labelFormatter ? labelFormatter(d.category) : d.category }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
        <Legend iconType="circle" iconSize={8} />
        <Bar dataKey="planned" name={plannedLabel} fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="actual" name={actualLabel} fill="#0d9488" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
