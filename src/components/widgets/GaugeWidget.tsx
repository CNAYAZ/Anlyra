'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { getGaugeValue } from '@/lib/widgets/data';
import type { Widget } from '@/lib/widgets/types';

export function GaugeWidget({ widget }: { widget: Widget }) {
  const locale = useLocale();
  const tMetrics = useTranslations('metrics');
  const metric = widget.config.metric ?? 'churn';
  const color = widget.config.color ?? '#16a34a';
  const { value, target, ratio, unit } = getGaugeValue(metric);

  const angle = Math.min(180, Math.max(0, ratio * 180));
  const radius = 70;
  const cx = 90;
  const cy = 86;
  const rad = (Math.PI * (180 - angle)) / 180;
  const x = cx + radius * Math.cos(rad);
  const y = cy - radius * Math.sin(rad);

  const formatValue = (v: number) => {
    if (unit === 'currency') return formatCurrency(v, locale);
    if (unit === 'percent') return `${formatNumber(v, locale, { maximumFractionDigits: 1 })}%`;
    return formatNumber(v, locale, { maximumFractionDigits: 0 });
  };

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{tMetrics(metric)}</p>
      <svg viewBox="0 0 180 110" className="w-full max-w-[200px]">
        <path d={`M 20 86 A 70 70 0 0 1 160 86`} stroke="#e2e8f0" strokeWidth={14} fill="none" strokeLinecap="round" />
        <path
          d={`M 20 86 A 70 70 0 0 1 ${x} ${y}`}
          stroke={color}
          strokeWidth={14}
          fill="none"
          strokeLinecap="round"
        />
        <text x={90} y={78} textAnchor="middle" fontSize={18} fontWeight={600} fill="#0f172a" fontFamily="JetBrains Mono">
          {formatValue(value)}
        </text>
      </svg>
      <p className="mt-1 text-xs text-muted-foreground">
        Target: <span className="font-mono">{formatValue(target)}</span>
      </p>
    </div>
  );
}
