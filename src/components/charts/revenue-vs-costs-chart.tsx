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

export function RevenueVsCostsChart({ data, locale }: { data: SeriesPoint[]; locale: Locale }) {
  const t = useTranslations('overview.chart');
  const formatted = data.map((p) => ({ ...p, label: formatMonth(`${p.period}-01`, locale) }));
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
          labelFormatter={(l) => l}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} />
        <Line
          type="monotone"
          dataKey="revenue"
          name={t('revenue')}
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#2563eb' }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="costs"
          name={t('costs')}
          stroke="#dc2626"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#dc2626' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
