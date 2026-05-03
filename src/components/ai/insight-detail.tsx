'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Check, EyeOff, ThumbsUp } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { InsightDTO } from '@/types/ai';
import type { InsightStatus } from '@prisma/client';

type Props = {
  insight: InsightDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (id: string, status: InsightStatus) => void;
  pending: boolean;
};

export function InsightDetail({ insight, open, onOpenChange, onUpdateStatus, pending }: Props) {
  const t = useTranslations('insights');
  const locale = useLocale();

  if (!insight) return null;
  const pct = Math.round(insight.confidence * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t(`type.${insight.type}`)}</Badge>
            <Badge variant="outline">{t(`priority.${insight.priority}`)}</Badge>
            <Badge variant="info">{t(`status.${insight.status}`)}</Badge>
          </div>
          <DialogTitle className="text-xl mt-2">{insight.title}</DialogTitle>
          <DialogDescription>{formatDate(insight.createdAt, locale, { dateStyle: 'long' })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed">
          <p className="font-medium text-foreground">{insight.summary}</p>
          <div className="rounded-md bg-muted/50 p-4 whitespace-pre-wrap">{insight.content}</div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{t('confidence')}</span>
              <span className="font-num text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  pct >= 80 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-danger'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pending || insight.status === 'IGNORED'}
            onClick={() => onUpdateStatus(insight.id, 'IGNORED')}
          >
            <EyeOff className="h-4 w-4" />
            {t('markIgnored')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending || insight.status === 'REVIEWED'}
            onClick={() => onUpdateStatus(insight.id, 'REVIEWED')}
          >
            <Check className="h-4 w-4" />
            {t('markReviewed')}
          </Button>
          <Button
            size="sm"
            disabled={pending || insight.status === 'IMPLEMENTED'}
            onClick={() => onUpdateStatus(insight.id, 'IMPLEMENTED')}
          >
            <ThumbsUp className="h-4 w-4" />
            {t('markImplemented')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
