'use client';

import * as React from 'react';
import { AlertCircle, RotateCcw, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

/* ─────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────── */

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  /** Alias for title — kept for backward compat with call-sites using message= */
  message?: string;
  description?: string;
  tone?: 'sage' | 'muted' | 'warn';
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    disabled?: boolean;
  };
  secondaryLink?: { label: string; href: string };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  description,
  tone = 'sage',
  action,
  secondaryLink,
  className,
}: EmptyStateProps) {
  const label = title || message || '';
  const toneClass = {
    sage: 'bg-sage-50 text-sage-700 dark:bg-sage-700/30 dark:text-sage-300',
    muted: 'bg-muted text-fg-2',
    warn: 'bg-warning-50 text-warning-700',
  }[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center text-center py-14 px-7 max-w-md mx-auto',
        className,
      )}
    >
      {Icon && (
        <div
          aria-hidden
          className={cn('h-16 w-16 rounded-full grid place-items-center mb-5', toneClass)}
        >
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-[17px] font-semibold tracking-tight mb-1.5 text-foreground">{label}</h3>
      {description && (
        <p className="text-[13.5px] text-fg-2 leading-snug mb-4 max-w-sm text-pretty">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} disabled={action.disabled} size="sm">
          {action.icon && <action.icon className="h-4 w-4 mr-1.5" />}
          {action.label}
        </Button>
      )}
      {secondaryLink && (
        <a
          href={secondaryLink.href}
          className="text-[12.5px] text-sage-700 dark:text-sage-300 mt-3 hover:underline"
        >
          {secondaryLink.label} →
        </a>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SKELETONS
───────────────────────────────────────────── */

export function LoadingSkeleton({ className, height = 'h-32' }: { className?: string; height?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted/40 w-full', height, className)} />;
}

export function KpiSkeleton() {
  return (
    <div aria-busy="true" className="rounded-lg border border-border bg-card p-5 flex flex-col gap-2.5 shadow-elev-1">
      <div className="flex justify-between items-start">
        <Skeleton className="h-2.5 w-3/5" />
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>
      <Skeleton className="h-7 w-3/5 mt-2" />
      <Skeleton className="h-2.5 w-2/5" />
      <Skeleton className="h-9 w-full mt-3 rounded-md" />
      <span className="sr-only" role="status">Caricamento KPI</span>
    </div>
  );
}

/** Alias used by billing page */
export const KpiCardSkeleton = KpiSkeleton;

export function IACardSkeleton() {
  return (
    <div aria-busy="true" className="rounded-lg border border-border bg-card p-5 flex gap-3 shadow-elev-1">
      <Skeleton className="h-[34px] w-[34px] rounded-md shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-2.5 w-1/4" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-2.5 w-12 shrink-0 self-start" />
      <span className="sr-only" role="status">Caricamento insight</span>
    </div>
  );
}

export function DataTableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div aria-busy="true" className="rounded-lg border border-border overflow-hidden">
      <div className="border-b border-border bg-bg px-3.5 py-2.5 grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-3/4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="border-b border-border px-3.5 py-3 grid gap-3 last:border-b-0 even:bg-muted/40"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((__, j) => (
            <Skeleton key={j} className="h-3.5 w-4/5" />
          ))}
        </div>
      ))}
      <span className="sr-only" role="status">Caricamento tabella</span>
    </div>
  );
}

export function ChartSkeleton({ height = 'h-72' }: { height?: string }) {
  return (
    <div aria-busy="true" className="rounded-lg border border-border bg-card p-5 shadow-elev-1 space-y-3">
      <Skeleton className="h-4 w-40" />
      <div className={cn('w-full rounded-md bg-muted/40 animate-pulse', height)} />
      <span className="sr-only" role="status">Caricamento grafico</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ERROR STATE
───────────────────────────────────────────── */

interface ErrorStateProps {
  variant?: 'inline' | 'fullpage';
  code?: string;
  bigCode?: string;
  title?: string;
  description?: string;
  retry?: {
    onClick: () => void;
    label?: string;
    ariaLabel?: string;
  };
  /** Backward-compat shorthand: onRetry={() => refetch()} */
  onRetry?: () => void;
  support?: { href: string; label?: string };
  className?: string;
}

export function ErrorState({
  variant = 'inline',
  code,
  bigCode,
  title,
  description,
  retry,
  onRetry,
  support,
  className,
}: ErrorStateProps) {
  const retryHandler = retry?.onClick ?? onRetry;

  if (variant === 'fullpage') {
    return (
      <div
        role="alert"
        className={cn(
          'min-h-screen flex flex-col items-center justify-center text-center px-6 py-24 bg-background',
          className,
        )}
      >
        {bigCode && (
          <p
            className="text-[88px] font-medium tabular-nums leading-none tracking-[-0.05em] text-fg-3/50 select-none mb-6"
            aria-hidden
          >
            {bigCode}
          </p>
        )}
        <div className="h-14 w-14 rounded-full grid place-items-center bg-danger-50 text-danger-700 mb-5">
          <AlertCircle className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-[20px] font-semibold tracking-tight mb-2 text-foreground">
          {title ?? 'Si è verificato un errore'}
        </h1>
        {description && (
          <p className="text-[14px] text-fg-2 leading-relaxed max-w-sm mb-6 text-pretty">
            {description}
          </p>
        )}
        {code && (
          <p className="font-mono text-xs text-fg-3 mb-6">Codice: {code}</p>
        )}
        {retryHandler && (
          <Button
            onClick={retryHandler}
            aria-label={retry?.ariaLabel ?? 'Riprova'}
            className="gap-1.5 transition-all duration-200 hover:-translate-y-[1px]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {retry?.label ?? 'Riprova'}
          </Button>
        )}
        {support && (
          <Link
            href={support.href}
            className="mt-3 text-[13px] text-sage-700 dark:text-sage-300 hover:underline"
          >
            {support.label ?? 'Contatta il supporto'} →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center py-10 px-6',
        'rounded-lg border border-danger-200/60 bg-danger-50/40 dark:bg-danger-500/5 dark:border-danger-500/20',
        className,
      )}
    >
      <div className="h-12 w-12 rounded-full grid place-items-center bg-danger-50 text-danger-700 mb-3">
        <AlertCircle className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-[14px] font-semibold text-foreground mb-1">
        {title ?? 'Qualcosa è andato storto'}
      </h3>
      {description && (
        <p className="text-[12.5px] text-fg-2 leading-snug mb-3 max-w-xs">{description}</p>
      )}
      {code && <p className="font-mono text-[11px] text-fg-3 mb-3">Errore: {code}</p>}
      {retryHandler && (
        <button
          onClick={retryHandler}
          aria-label={retry?.ariaLabel ?? 'Riprova'}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-muted transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          {retry?.label ?? 'Riprova'}
        </button>
      )}
      {support && (
        <Link
          href={support.href}
          className="mt-2 text-[12px] text-sage-700 dark:text-sage-300 hover:underline"
        >
          {support.label ?? 'Contatta il supporto'} →
        </Link>
      )}
    </div>
  );
}
