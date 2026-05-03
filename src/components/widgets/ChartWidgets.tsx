'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatNumber } from '@/lib/utils';
import { getCategoryBreakdown, getRadarProfile, getSeries } from '@/lib/widgets/data';
import type { Widget } from '@/lib/widgets/types';

const PIE_COLORS = ['#3b82f6', '#0d9488', '#f59e0b', '#dc2626', '#8b5cf6'];

const tickStyle = { fontSize: 10, fill: '#64748b' } as const;

export function LineWidget({ widget }: { widget: Widget }) {
  const locale = useLocale();
  const data = getSeries(widget.config.metric ?? 'revenue', widget.config.period ?? '30d', locale, 3);
  const color = widget.config.color ?? '#3b82f6';
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => formatNumber(v, locale, { notation: 'compact' })} />
        <Tooltip formatter={(v: number) => formatNumber(v, locale, { maximumFractionDigits: 0 })} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarWidget({ widget }: { widget: Widget }) {
  const locale = useLocale();
  const data = getSeries(widget.config.metric ?? 'orders', widget.config.period ?? '30d', locale, 5);
  const color = widget.config.color ?? '#0d9488';
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => formatNumber(v, locale, { notation: 'compact' })} />
        <Tooltip formatter={(v: number) => formatNumber(v, locale, { maximumFractionDigits: 0 })} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AreaWidget({ widget }: { widget: Widget }) {
  const locale = useLocale();
  const data = getSeries(widget.config.metric ?? 'mrr', widget.config.period ?? '12m', locale, 7);
  const color = widget.config.color ?? '#3b82f6';
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => formatNumber(v, locale, { notation: 'compact' })} />
        <Tooltip formatter={(v: number) => formatNumber(v, locale, { maximumFractionDigits: 0 })} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#grad-${widget.id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PieWidget({ widget }: { widget: Widget }) {
  const locale = useLocale();
  const data = getCategoryBreakdown(widget.config.metric ?? 'revenue', locale);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius="40%" outerRadius="80%" paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatNumber(v, locale, { maximumFractionDigits: 0 })} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RadarWidget({ widget }: { widget: Widget }) {
  const locale = useLocale();
  const t = useTranslations('widgets.radar');
  const data = getRadarProfile(locale);
  const color = widget.config.color ?? '#0d9488';
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="dimension" tick={tickStyle} />
        <PolarRadiusAxis tick={tickStyle} angle={30} />
        <Radar name={t('name')} dataKey="you" stroke={color} fill={color} fillOpacity={0.35} />
        <Radar name="Industry" dataKey="industry" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}
