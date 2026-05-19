'use client';

import * as React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  Sparkles,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ── */

type Priority = 'high' | 'medium' | 'low' | 'critical' | 'opportunity' | 'warning' | 'info';
type Kind     = 'insight' | 'alert';
type Status   = 'new' | 'reviewed' | 'implemented' | 'ignored' | 'read' | 'resolved' | 'dismissed';

export interface InsightCardProps {
  kind: Kind;
  priority: Priority;
  title: string;
  description: string;
  timestamp?: string;
  status?: Status;
  source?: string;
  confidence?: number; // 0-100
  actions?: React.ReactNode;
  onOpen?: () => void;
  density?: 'default' | 'dense';
  variant?: 'default' | 'spotlight';
  className?: string;
}

/* ── Priority maps ── */

const borderL: Record<Priority, string> = {
  critical:    'border-l-danger-500',
  high:        'border-l-danger-500',
  warning:     'border-l-warning-500',
  medium:      'border-l-warning-500',
  info:        'border-l-info-500',
  low:         'border-l-info-500',
  opportunity: 'border-l-success-500',
};

const iconWrap: Record<Priority, string> = {
  critical:    'bg-danger-50 text-danger-700',
  high:        'bg-danger-50 text-danger-700',
  warning:     'bg-warning-50 text-warning-700',
  medium:      'bg-warning-50 text-warning-700',
  info:        'bg-info-50 text-info-700',
  low:         'bg-info-50 text-info-700',
  opportunity: 'bg-success-50 text-success-700',
};

const priorityLabel: Record<Priority, string> = {
  critical:    'Critico',
  high:        'Alto',
  warning:     'Attenzione',
  medium:      'Medio',
  info:        'Info',
  low:         'Basso',
  opportunity: 'Opportunità',
};

const pillColor: Record<Priority, string> = {
  critical:    'bg-danger-50 text-danger-700',
  high:        'bg-danger-50 text-danger-700',
  warning:     'bg-warning-50 text-warning-700',
  medium:      'bg-warning-50 text-warning-700',
  info:        'bg-info-50 text-info-700',
  low:         'bg-info-50 text-info-700',
  opportunity: 'bg-success-50 text-success-700',
};

/* ── Priority icon ── */

function PriorityIcon({ priority, kind }: { priority: Priority; kind: Kind }) {
  if (priority === 'critical' || priority === 'high')
    return <AlertCircle className="h-4 w-4" aria-hidden />;
  if (priority === 'warning' || priority === 'medium')
    return <AlertTriangle className="h-4 w-4" aria-hidden />;
  if (priority === 'opportunity')
    return <TrendingUp className="h-4 w-4" aria-hidden />;
  if (kind === 'insight') return <Sparkles className="h-4 w-4" aria-hidden />;
  if (kind === 'alert')   return <Zap className="h-4 w-4" aria-hidden />;
  return <Info className="h-4 w-4" aria-hidden />;
}

/* ── Timestamp helper ── */

function formatRelative(iso: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)       return 'Ora';
    if (diff < 3600)     return `${Math.floor(diff / 60)} min fa`;
    if (diff < 86400)    return `${Math.floor(diff / 3600)} ore fa`;
    if (diff < 86400 * 7)return `${Math.floor(diff / 86400)} giorni fa`;
    return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

/* ── Status opacity/badge ── */

const dimStatus: Status[] = ['ignored', 'dismissed'];

/* ── Component ── */

export function InsightCard({
  kind,
  priority,
  title,
  description,
  timestamp,
  status,
  source,
  confidence,
  actions,
  onOpen,
  density = 'default',
  variant = 'default',
  className,
}: InsightCardProps) {
  const isDim  = status ? dimStatus.includes(status) : false;
  const isSpot = variant === 'spotlight';
  const titleId = React.useId();

  /* keyboard handler for cliccable card */
  const handleKeyDown = onOpen
    ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }
    : undefined;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'bg-card border border-border border-l-[3px] rounded-lg shadow-elev-1',
        'grid grid-cols-[34px_1fr_auto] gap-x-3.5',
        density === 'default' ? 'p-5 pl-[22px]' : 'p-3.5 pl-4',
        'transition-all',
        onOpen && 'cursor-pointer hover:shadow-elev-2 hover:-translate-y-px focus-within:ring-2 focus-within:ring-sage-500 focus-within:ring-offset-2',
        isDim && 'opacity-70',
        borderL[priority],
        className,
      )}
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* ── Col 1: icon wrap ── */}
      <span
        aria-hidden
        className={cn(
          'grid h-[34px] w-[34px] shrink-0 place-items-center rounded-md row-span-2 self-start mt-0.5',
          iconWrap[priority],
        )}
      >
        <PriorityIcon priority={priority} kind={kind} />
      </span>

      {/* ── Col 2: content ── */}
      <div className="min-w-0 col-start-2 row-start-1 row-span-2">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          <span className={cn('rounded-sm px-1.5 py-px text-[10.5px] font-medium', pillColor[priority])}>
            {priorityLabel[priority]}
          </span>
          <span className="rounded-sm px-1.5 py-px text-[10.5px] font-medium bg-muted text-fg-2 capitalize">
            {kind === 'insight' ? 'Insight' : 'Alert'}
          </span>
          {status && (
            <span className="rounded-sm px-1.5 py-px text-[10.5px] font-medium bg-muted text-fg-3 capitalize">
              {status}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          id={titleId}
          className="text-[15.5px] font-semibold leading-snug tracking-tight mb-1 text-pretty"
        >
          {title}
        </h3>

        {/* Description */}
        <p className={cn('text-[13.5px] text-fg-2 leading-relaxed text-pretty', !isSpot && 'line-clamp-2')}>
          {description}
        </p>

        {/* Source */}
        {source && !isSpot && (
          <p className="font-mono text-[10.5px] text-fg-3 mt-2 inline-flex items-center gap-1">
            <span aria-hidden>·</span> {source}
          </p>
        )}

        {/* Confidence bar (insight only, not spotlight) */}
        {confidence !== undefined && !isSpot && (
          <div className="flex items-center gap-2 mt-2.5 text-[11px] text-fg-3">
            <span className="uppercase tracking-wider font-medium shrink-0">Confidence</span>
            <div
              role="meter"
              aria-valuenow={confidence}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Confidence ${confidence}%`}
              className="relative h-1 flex-1 max-w-[140px] bg-muted rounded-full overflow-hidden"
            >
              <div
                className="absolute inset-y-0 left-0 bg-sage-500 dark:bg-sage-300 rounded-full"
                style={{ width: `${Math.min(Math.max(confidence, 0), 100)}%` }}
              />
            </div>
            <span className="tabular-nums font-medium text-fg-2 shrink-0">{confidence}%</span>
          </div>
        )}
      </div>

      {/* ── Col 3: meta ── */}
      <div className="col-start-3 row-start-1 row-span-2 flex flex-col items-end gap-1.5 pt-0.5 shrink-0">
        {timestamp && (
          <time
            dateTime={timestamp}
            className="font-mono text-[10.5px] text-fg-3 whitespace-nowrap"
          >
            {formatRelative(timestamp)}
          </time>
        )}
        {(status === 'resolved' || status === 'implemented') && (
          <CheckCircle2 className="h-3.5 w-3.5 text-success-500" aria-label="Completato" />
        )}
      </div>

      {/* ── Footer actions (col-span-3, not in spotlight) ── */}
      {!isSpot && actions && (
        <div
          className="col-span-3 flex items-center gap-1 pt-3.5 mt-3.5 border-t border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
          {onOpen && (
            <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-fg-2 pointer-events-none">
              Apri →
            </span>
          )}
        </div>
      )}

      {/* ── Spotlight footer ── */}
      {isSpot && onOpen && (
        <div className="col-span-3 mt-3 pt-3 border-t border-border flex justify-end">
          <span className="text-[12.5px] font-medium text-sage-700 dark:text-sage-300">
            Vai al dettaglio →
          </span>
        </div>
      )}
    </article>
  );
}
