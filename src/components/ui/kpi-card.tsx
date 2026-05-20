'use client';

import * as React from 'react';
import { AlertCircle, BarChart3, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline } from './sparkline';
import { DeltaBadge } from './delta-badge';

interface BenchmarkData {
  value: string | number;
  label: string;
  percentile: number;
  quartiles: { p25: string; p50: string; p75: string };
}

export interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: { prefix?: string; suffix?: string };
  delta?: {
    value: string;
    sentiment: 'positive' | 'negative' | 'warning' | 'neutral';
    direction?: 'up' | 'down' | 'flat';
    ariaLabel?: string;
  };
  subtitle?: string;
  sparkline?: number[];
  sparklineAriaLabel?: string;
  icon?: LucideIcon;
  density?: 'default' | 'dense';
  state?: 'idle' | 'loading' | 'empty' | 'error';
  empty?: { message: string; hint?: string };
  error?: { message: string; onRetry?: () => void };
  benchmark?: BenchmarkData;
  className?: string;
}

export function KpiCardSkeleton({ density = 'default' }: { density?: 'default' | 'dense' }) {
  return (
    <div
      aria-busy="true"
      className={cn(
        'bg-card border border-border rounded-lg flex flex-col gap-2.5 animate-pulse',
        density === 'default' ? 'p-5' : 'p-3.5',
      )}
    >
      <div className="flex justify-between items-start">
        <div className="h-2.5 w-3/5 rounded bg-muted" />
        <div className="h-6 w-6 rounded-sm bg-muted" />
      </div>
      <div className="h-8 w-2/5 rounded bg-muted mt-1" />
      <div className="h-2.5 w-2/5 rounded bg-muted" />
      <div className={cn('w-full rounded-md bg-muted mt-1', density === 'default' ? 'h-9' : 'h-7')} />
      <span className="sr-only" role="status">Caricamento KPI</span>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  subtitle,
  sparkline,
  sparklineAriaLabel,
  icon: Icon,
  density = 'default',
  state = 'idle',
  empty,
  error,
  benchmark,
  className,
}: KpiCardProps) {
  if (state === 'loading') return <KpiCardSkeleton density={density} />;

  const isDense = density === 'dense';

  return (
    <div
      className={cn(
        'bg-card border border-border shadow-elev-1 flex flex-col',
        isDense ? 'rounded-md p-3.5' : 'rounded-lg p-5',
        state === 'error' && 'border-danger-50',
        className,
      )}
    >
      {/* ── Header ── */}
      <div className={cn('flex items-start justify-between gap-2.5', isDense ? 'mb-1.5' : 'mb-2.5')}>
        <p className="text-[10.5px] font-medium uppercase tracking-wider text-fg-3 break-keep leading-tight">
          {label}
        </p>
        {Icon && (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-sm text-fg-3 hover:bg-muted transition-colors">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>

      {/* ── Error state ── */}
      {state === 'error' && (
        <div className="flex flex-col items-center py-4 gap-2 text-center">
          <AlertCircle className="h-6 w-6 text-danger-500" aria-hidden />
          <p className="text-[12px] text-danger-700">{error?.message ?? 'Errore di caricamento'}</p>
          {error?.onRetry && (
            <button
              onClick={error.onRetry}
              className="text-[11.5px] text-sage-700 underline underline-offset-2 hover:text-sage-600"
            >
              Riprova
            </button>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {state === 'empty' && (
        <div className="flex flex-col items-center py-4 gap-1.5 text-center">
          <BarChart3 className="h-6 w-6 text-fg-3" aria-hidden />
          <p className="text-[12px] text-fg-2">{empty?.message ?? 'Nessun dato disponibile'}</p>
          {empty?.hint && <p className="text-[11px] text-fg-3">{empty.hint}</p>}
        </div>
      )}

      {/* ── Idle / data ── */}
      {state === 'idle' && (
        <>
          {/* Value row */}
          <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-1 mb-1">
            <span
              className={cn(
                "font-semibold text-foreground tabular-nums leading-[1.05] [font-feature-settings:'tnum'_1,'ss01'_1] tracking-[-0.022em]",
                isDense ? 'text-2xl tracking-[-0.015em]' : 'text-[34px]',
              )}
            >
              {unit?.prefix && (
                <span className="text-fg-2 font-medium text-[0.78em] tracking-[-0.01em] mr-1">
                  {unit.prefix}
                </span>
              )}
              {value}
              {unit?.suffix && (
                <span className="text-fg-2 font-medium text-[0.78em] tracking-[-0.01em] ml-1">
                  {unit.suffix}
                </span>
              )}
            </span>
            {delta && (
              <DeltaBadge
                value={delta.value}
                sentiment={delta.sentiment}
                direction={delta.direction}
                aria-label={delta.ariaLabel}
              />
            )}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className={cn('text-fg-3 leading-snug mt-1', isDense ? 'text-[11.5px]' : 'text-xs')}>
              {subtitle}
            </p>
          )}

          {/* Benchmark bar */}
          {benchmark && (
            <div className="mt-3">
              <div className="relative h-1.5 w-full rounded-full bg-muted mb-2 overflow-visible">
                {/* p25 / p50 / p75 tick marks */}
                {[25, 50, 75].map((q) => (
                  <div
                    key={q}
                    aria-hidden
                    className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-border-strong"
                    style={{ left: `${q}%` }}
                  />
                ))}
                {/* Company position marker */}
                <div
                  aria-hidden
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 h-3 w-[3px] rounded-sm -translate-x-1/2',
                    benchmark.percentile >= 50 ? 'bg-sage-500' : 'bg-warning-500',
                  )}
                  style={{ left: `${Math.min(Math.max(benchmark.percentile, 2), 98)}%` }}
                />
              </div>
              <p className="text-[10.5px] text-fg-3 flex items-center gap-1.5 flex-wrap">
                <span>Mediana settore:</span>
                <span className="tabular-nums font-medium text-fg-2">{benchmark.quartiles.p50}</span>
                <span aria-hidden>·</span>
                <span className={benchmark.percentile >= 50 ? 'text-success-700' : 'text-warning-700'}>
                  {benchmark.label}
                </span>
              </p>
            </div>
          )}

          {/* Sparkline */}
          {sparkline && sparkline.length >= 2 && (
            <Sparkline
              data={sparkline}
              aria-label={sparklineAriaLabel}
              className={cn('mt-3.5 w-full', isDense ? 'h-7' : 'h-9')}
            />
          )}
        </>
      )}
    </div>
  );
}
