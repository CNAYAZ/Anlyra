'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingSkeleton({ className, rows = 4 }: { className?: string; rows?: number }) {
  return (
    <div className={cn('animate-pulse space-y-3', className)} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-muted" style={{ width: `${100 - i * 8}%` }} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-4 h-8 w-32 rounded bg-muted" />
      <div className="mt-3 h-3 w-20 rounded bg-muted" />
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations('common');
  return (
    <div className="card flex items-center gap-3 text-rose-700">
      <AlertCircle className="h-5 w-5 shrink-0" />
      <p className="text-sm flex-1">{t('error')}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
        >
          <RefreshCw className="h-3 w-3" /> {t('retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const t = useTranslations('common');
  return (
    <div className="card flex flex-col items-center justify-center py-10 text-muted-foreground">
      <Inbox className="h-8 w-8 mb-2" />
      <p className="text-sm">{message ?? t('empty')}</p>
    </div>
  );
}
