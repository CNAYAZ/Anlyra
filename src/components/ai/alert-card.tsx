'use client';

import { useTranslations, useLocale } from 'next-intl';
import { AlertOctagon, AlertTriangle, Info, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { AlertDTO, AlertSeverity, AlertStatus } from '@/types/ai';
import type { Locale } from '@/i18n/config';

const severityIcon: Record<AlertSeverity, React.ComponentType<{ className?: string }>> = {
  CRITICAL: AlertOctagon,
  HIGH: AlertTriangle,
  MEDIUM: Zap,
  LOW: Info,
};

const severityBorder: Record<AlertSeverity, string> = {
  CRITICAL: 'border-l-danger',
  HIGH: 'border-l-danger',
  MEDIUM: 'border-l-warning',
  LOW: 'border-l-primary-accent',
};

const severityIconBg: Record<AlertSeverity, string> = {
  CRITICAL: 'bg-danger/10 text-danger',
  HIGH: 'bg-danger/10 text-danger',
  MEDIUM: 'bg-warning/10 text-warning',
  LOW: 'bg-primary-accent/10 text-primary-accent',
};

const severityVariant: Record<AlertSeverity, 'danger' | 'warning' | 'info'> = {
  CRITICAL: 'danger',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
};

const statusVariant: Record<AlertStatus, 'info' | 'neutral' | 'success'> = {
  NEW: 'info',
  READ: 'neutral',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
};

type Props = {
  alert: AlertDTO;
  onClick: () => void;
};

export function AlertCard({ alert, onClick }: Props) {
  const t = useTranslations('alerts');
  const locale = useLocale() as Locale;
  const Icon = severityIcon[alert.severity as AlertSeverity] ?? Info;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col gap-3 rounded-lg border border-border border-l-4 bg-card p-5 text-left shadow-card transition-shadow hover:shadow-md',
        severityBorder[alert.severity as AlertSeverity],
        alert.status === 'DISMISSED' && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-md', severityIconBg[alert.severity as AlertSeverity])}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 space-y-1">
          <h3 className="font-heading text-base font-semibold leading-tight">{alert.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{alert.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <Badge variant={severityVariant[alert.severity as AlertSeverity]}>
          {t(`severity.${alert.severity}`)}
        </Badge>
        <Badge variant={statusVariant[alert.status as AlertStatus]}>
          {t(`status.${alert.status}`)}
        </Badge>
        <span className="ml-auto text-muted-foreground">{formatDate(alert.createdAt, locale)}</span>
      </div>
    </button>
  );
}
