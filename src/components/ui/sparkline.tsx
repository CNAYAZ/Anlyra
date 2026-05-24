'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SparklineProps {
  data: number[];
  className?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

export function Sparkline({
  data,
  className,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = true,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const W = 100;
  const H = 36;
  const pad = { t: 3, b: 5, l: 2, r: 8 };

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r),
    y: pad.t + (1 - (v - min) / range) * (H - pad.t - pad.b),
  }));

  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L${pts[pts.length - 1].x.toFixed(2)},${(H - pad.b).toFixed(2)}` +
    ` L${pts[0].x.toFixed(2)},${(H - pad.b).toFixed(2)} Z`;

  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      className={cn('overflow-visible', className)}
    >
      {/* area fill */}
      <path
        d={areaPath}
        fillOpacity={0.10}
        className="fill-sage-500 dark:fill-sage-300"
      />
      {/* line */}
      <path
        d={linePath}
        fill="none"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-sage-500 dark:stroke-sage-300"
      />
      {/* last-dot highlight */}
      <circle
        cx={last.x}
        cy={last.y}
        r={2.5}
        strokeWidth={2}
        className="fill-sage-500 stroke-card dark:fill-sage-300"
      />
    </svg>
  );
}
