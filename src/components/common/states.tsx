'use client';

import * as React from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingState({ rows = 4 }: { rows?: number }) {
  const t = useTranslations('states');
  return (
    <Card>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t('loadingTitle')}...</span>
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const t = useTranslations('states');
  return (
    <Card>
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="rounded-full bg-muted p-3 text-muted-foreground">
          <Inbox className="h-6 w-6" />
        </div>
        <div>
          <div className="font-heading text-base font-semibold text-primary">
            {title ?? t('emptyTitle')}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {description ?? t('emptyDescription')}
          </div>
        </div>
        {action}
      </div>
    </Card>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const t = useTranslations('states');
  const common = useTranslations('common');
  return (
    <Card>
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="rounded-full bg-danger/10 p-3 text-danger">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <div className="font-heading text-base font-semibold text-primary">
            {title ?? t('errorTitle')}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {description ?? t('errorDescription')}
          </div>
        </div>
        {onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {common('retry')}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
