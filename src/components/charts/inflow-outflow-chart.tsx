'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslations } from 'next-intl';
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
  const tc = useTranslations('common');
  // The LAST bar is always the current, possibly-partial month (see
  // periodWindow in lib/analysis/financial.ts) — drawn at reduced opacity and
  // called out in the tooltip, rather than letting it read as a real drop in
  // flow just because it covers fewer days than the months before it.
  const lastIndex = data.length - 1;
  const formatted = data.map((p, i) => ({
    label: formatMonth(`${p.period}-01`, locale),
    inflow: p.inflow,
    outflow: -p.outflow,
    isPartial: i === lastIndex,
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
          labelFormatter={(l: string, payload) =>
            payload?.[0]?.payload?.isPartial ? `${l} (${tc('partialMonth')})` : l
          }
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} />
        <Bar dataKey="inflow" name={inflowLabel} fill="#16a34a" radius={[4, 4, 0, 0]}>
          {formatted.map((p, i) => (
            <Cell key={`inflow-${i}`} fillOpacity={p.isPartial ? 0.45 : 1} />
          ))}
        </Bar>
        <Bar dataKey="outflow" name={outflowLabel} fill="#dc2626" radius={[4, 4, 0, 0]}>
          {formatted.map((p, i) => (
            <Cell key={`outflow-${i}`} fillOpacity={p.isPartial ? 0.45 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
