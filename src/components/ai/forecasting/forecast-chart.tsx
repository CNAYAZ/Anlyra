'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrencyCompact, formatMonth } from '@/lib/utils';
import type { Locale } from '@/lib/utils';

export type HistoricalPoint = { month: string; value: number };
export type ForecastPoint = { month: string; value: number; lower: number; upper: number };

type ChartRow = {
  label: string;
  historical?: number;
  forecast?: number;
  lower?: number;
  upper?: number;
};

type Props = {
  historical: HistoricalPoint[];
  forecast: ForecastPoint[];
  locale: Locale;
  height?: number;
};

export function ForecastChart({ historical, forecast, locale, height = 340 }: Props) {
  const histRows: ChartRow[] = historical.map((h) => ({
    label: formatMonth(`${h.month}-01`, locale),
    historical: h.value,
  }));

  const forecastRows: ChartRow[] = forecast.map((f) => ({
    label: formatMonth(`${f.month}-01`, locale),
    forecast: f.value,
    lower: f.lower,
    upper: f.upper - f.lower, // recharts Area uses stacked values
  }));

  // Overlap last historical point with first forecast point for continuity
  const bridgeValue = historical[historical.length - 1]?.value;
  if (bridgeValue !== undefined && forecastRows.length > 0) {
    forecastRows[0] = { ...forecastRows[0], historical: bridgeValue };
  }

  const data: ChartRow[] = [...histRows, ...forecastRows];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fcConfidence" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary-accent))" stopOpacity={0.15} />
            <stop offset="100%" stopColor="hsl(var(--primary-accent))" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(v) => formatCurrencyCompact(v, locale)}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            fontSize: 12,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
          }}
          formatter={(v: number, name: string) => [
            formatCurrencyCompact(v, locale),
            name,
          ]}
        />

        {/* Confidence band: stacked area (lower baseline + width) */}
        <Area
          type="monotone"
          dataKey="lower"
          stroke="none"
          fill="none"
          legendType="none"
          name=""
        />
        <Area
          type="monotone"
          dataKey="upper"
          stroke="none"
          fill="url(#fcConfidence)"
          legendType="none"
          name=""
          stackId="ci"
        />

        {/* Historical line */}
        <Line
          type="monotone"
          dataKey="historical"
          stroke="hsl(var(--foreground))"
          strokeWidth={2.5}
          dot={{ r: 3, fill: 'hsl(var(--foreground))' }}
          activeDot={{ r: 5 }}
          connectNulls
          name="Storico"
        />

        {/* Forecast line (dashed) */}
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="hsl(var(--primary-accent))"
          strokeWidth={2.5}
          strokeDasharray="8 4"
          dot={{ r: 3, fill: 'hsl(var(--primary-accent))' }}
          activeDot={{ r: 5 }}
          connectNulls
          name="Previsione"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
