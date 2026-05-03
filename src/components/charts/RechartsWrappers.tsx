'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLocale } from 'next-intl';
import { formatNumber } from '@/lib/utils';

export interface SeriesPoint {
  [key: string]: string | number;
}

export interface SeriesConfig {
  dataKey: string;
  label: string;
  color: string;
  type?: 'line' | 'area' | 'bar';
}

const AXIS_STYLE = { fontSize: 11, fill: '#64748b' } as const;

export function MultiLineChart({
  data,
  series,
  xKey = 'label',
}: {
  data: SeriesPoint[];
  series: SeriesConfig[];
  xKey?: string;
}) {
  const locale = useLocale();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
        <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tickFormatter={(v) => formatNumber(Number(v), locale)} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          formatter={(v: number) => formatNumber(v, locale)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarSeriesChart({
  data,
  series,
  xKey = 'label',
}: {
  data: SeriesPoint[];
  series: SeriesConfig[];
  xKey?: string;
}) {
  const locale = useLocale();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
        <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tickFormatter={(v) => formatNumber(Number(v), locale)} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          formatter={(v: number) => formatNumber(v, locale)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Bar key={s.dataKey} dataKey={s.dataKey} name={s.label} fill={s.color} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AreaSeriesChart({
  data,
  series,
  xKey = 'label',
}: {
  data: SeriesPoint[];
  series: SeriesConfig[];
  xKey?: string;
}) {
  const locale = useLocale();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.dataKey} id={`grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
        <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tickFormatter={(v) => formatNumber(Number(v), locale)} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          formatter={(v: number) => formatNumber(v, locale)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Area
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad-${s.dataKey})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
