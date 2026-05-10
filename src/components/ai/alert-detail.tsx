'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Check, EyeOff, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import type { AlertDTO, AlertSeverity, AlertStatus } from '@/types/ai';
import type { Locale } from '@/i18n/config';

type Props = {
  alert: AlertDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (id: string, status: AlertStatus) => void;
  pending: boolean;
};

const severityVariant: Record<AlertSeverity, 'danger' | 'warning' | 'info'> = {
  CRITICAL: 'danger',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
};

export function AlertDetail({ alert, open, onOpenChange, onUpdateStatus, pending }: Props) {
  const t = useTranslations('alerts');
  const locale = useLocale() as Locale;

  if (!alert) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant={severityVariant[alert.severity as AlertSeverity]}>
              {t(`severity.${alert.severity}`)}
            </Badge>
            <Badge variant="neutral">
              {t(`status.${alert.status}`)}
            </Badge>
          </div>
          <DialogTitle className="text-xl mt-2">{alert.title}</DialogTitle>
          <DialogDescription>
            {t('createdAt')}: {formatDate(alert.createdAt, locale)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed">
          <p className="text-foreground">{alert.description}</p>

          <div className="rounded-md bg-muted/50 p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('recommendation')}
            </p>
            <p className="text-foreground">{alert.recommendation}</p>
          </div>

          <div className="text-xs text-muted-foreground">
            <span className="font-medium">{t('source')}:</span> {alert.source}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || alert.status === 'DISMISSED'}
            onClick={() => onUpdateStatus(alert.id, 'DISMISSED')}
          >
            <EyeOff className="h-4 w-4" />
            {t('markDismissed')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending || alert.status === 'READ'}
            onClick={() => onUpdateStatus(alert.id, 'READ')}
          >
            <Check className="h-4 w-4" />
            {t('markRead')}
          </Button>
          <Button
            size="sm"
            disabled={pending || alert.status === 'RESOLVED'}
            onClick={() => onUpdateStatus(alert.id, 'RESOLVED')}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t('markResolved')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
