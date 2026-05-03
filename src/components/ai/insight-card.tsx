'use client';

import { useTranslations, useLocale } from 'next-intl';
import { AlertTriangle, ArrowRight, Lightbulb, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { InsightDTO } from '@/types/ai';
import type { InsightPriority, InsightType } from '@prisma/client';

const typeIcon: Record<InsightType, React.ComponentType<{ className?: string }>> = {
  STRATEGY: Lightbulb,
  WARNING: AlertTriangle,
  OPPORTUNITY: Star,
  ACTION: ArrowRight,
};

const priorityBorder: Record<InsightPriority, string> = {
  HIGH: 'border-l-danger',
  MEDIUM: 'border-l-warning',
  LOW: 'border-l-primary-accent',
};

const typeIconBg: Record<InsightType, string> = {
  STRATEGY: 'bg-amber-50 text-amber-600',
  WARNING: 'bg-red-50 text-danger',
  OPPORTUNITY: 'bg-emerald-50 text-emerald-600',
  ACTION: 'bg-blue-50 text-primary-accent',
};

const statusVariant: Record<InsightDTO['status'], 'secondary' | 'success' | 'info' | 'warning'> = {
  NEW: 'info',
  REVIEWED: 'warning',
  IMPLEMENTED: 'success',
  IGNORED: 'secondary',
};

type Props = {
  insight: InsightDTO;
  onClick: () => void;
};

export function InsightCard({ insight, onClick }: Props) {
  const t = useTranslations('insights');
  const locale = useLocale();
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
        <Badge variant="outline">{t(`type.${insight.type}`)}</Badge>
        <Badge variant="outline">{t(`priority.${insight.priority}`)}</Badge>
        <span className="ml-auto text-muted-foreground">{formatDate(insight.createdAt, locale)}</span>
      </div>
    </button>
  );
}
