'use client';

import { useLocale } from 'next-intl';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { formatNumber } from '@/lib/utils';
import { getForecast } from '@/lib/widgets/data';
import type { Widget } from '@/lib/widgets/types';

export function ForecastWidget({ widget }: { widget: Widget }) {
  const locale = useLocale();
  const metric = widget.config.metric ?? 'revenue';
  const color = widget.config.color ?? '#2563eb';
  const { history, forecast } = getForecast(metric);

  const data = [
    ...history.map((p) => ({ label: p.label, actual: p.value, forecast: null as number | null })),
    {
      label: history[history.length - 1].label,
      actual: history[history.length - 1].value,
      forecast: history[history.length - 1].value,
    },
    ...forecast.map((p) => ({ label: p.label, actual: null as number | null, forecast: p.value })),
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v) => formatNumber(v, locale, { notation: 'compact' })}
        />
        <Tooltip formatter={(v: number) => formatNumber(v, locale, { maximumFractionDigits: 0 })} />
        <Line type="monotone" dataKey="actual" stroke={color} strokeWidth={2.5} dot={false} connectNulls={false} />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke={color}
          strokeWidth={2.5}
          strokeDasharray="5 4"
          dot={false}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
