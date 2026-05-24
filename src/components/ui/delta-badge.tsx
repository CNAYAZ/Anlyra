'use client';

import * as React from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Sentiment = 'positive' | 'negative' | 'warning' | 'neutral';
type Direction = 'up' | 'down' | 'flat';

export interface DeltaBadgeProps {
  value: string;
  sentiment: Sentiment;
  direction?: Direction;
  'aria-label'?: string;
  className?: string;
}

const sentimentCls: Record<Sentiment, string> = {
  positive: 'bg-success-50 text-success-700',
  negative: 'bg-danger-50 text-danger-700',
  warning:  'bg-warning-50 text-warning-700',
  neutral:  'bg-muted text-muted-foreground',
};

const DirIcon: Record<Direction, React.ElementType> = {
  up:   ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
};

export function DeltaBadge({
  value,
  sentiment,
  direction,
  'aria-label': ariaLabel,
  className,
}: DeltaBadgeProps) {
  const Icon = direction ? DirIcon[direction] : null;

  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-2 py-0.5',
        'text-[11.5px] font-semibold tabular-nums leading-tight',
        sentimentCls[sentiment],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden />}
      {value}
    </span>
  );
}
