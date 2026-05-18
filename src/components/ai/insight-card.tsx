'use client';

import { useTranslations, useLocale } from 'next-intl';
import { AlertTriangle, ArrowRight, Lightbulb, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import type { InsightDTO } from '@/types/ai';

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  STRATEGY: Lightbulb,
  WARNING: AlertTriangle,
  OPPORTUNITY: Star,
  ACTION: ArrowRight,
};

const priorityBorder: Record<string, string> = {
  HIGH: 'border-l-danger',
  MEDIUM: 'border-l-warning',
  LOW: 'border-l-primary-accent',
};

const typeIconBg: Record<string, string> = {
  STRATEGY: 'bg-warning/10 text-warning',
  WARNING: 'bg-danger/10 text-danger',
  OPPORTUNITY: 'bg-success/10 text-success',
  ACTION: 'bg-primary-accent/10 text-primary-accent',
};

const statusVariant: Record<string, 'neutral' | 'success' | 'info' | 'warning'> = {
  NEW: 'info',
  REVIEWED: 'warning',
  IMPLEMENTED: 'success',
  IGNORED: 'neutral',
};

type Props = {
  insight: InsightDTO;
  onClick: () => void;
};

export function InsightCard({ insight, onClick }: Props) {
  const t = useTranslations('insights');
  const locale = useLocale() as Locale;
  const Icon = typeIcon[insight.type];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col gap-3 rounded-lg border border-border border-l-4 bg-card p-5 text-left shadow-card transition-shadow hover:shadow-md',
        priorityBorder[insight.priority]
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-md', typeIconBg[insight.type])}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="flex-1 space-y-1">
          <h3 className="font-heading text-base font-semibold leading-tight">{insight.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{insight.summary}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <Badge variant={statusVariant[insight.status]}>{t(`status.${insight.status}`)}</Badge>
        <Badge variant="neutral">{t(`type.${insight.type}`)}</Badge>
        <Badge variant="neutral">{t(`priority.${insight.priority}`)}</Badge>
        <span className="ml-auto text-muted-foreground">{formatDate(insight.createdAt, locale)}</span>
      </div>
    </button>
  );
}
