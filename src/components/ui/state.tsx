'use client';

import { AlertCircle, Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function LoadingSkeleton({ className, height = 'h-32' }: { className?: string; height?: string }) {
  return <div className={cn('skeleton w-full', height, className)} />;
}

export function KpiSkeleton() {
  return (
    <div className="card space-y-3">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-8 w-28" />
      <div className="skeleton h-3 w-24" />
    </div>
  );
}

export function ChartSkeleton({ height = 'h-72' }: { height?: string }) {
  return (
    <div className="card space-y-3">
      <div className="skeleton h-4 w-40" />
      <div className={cn('skeleton w-full', height)} />
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations('common');
  return (
    <div className="card flex flex-col items-center justify-center text-center py-10 gap-2">
      <AlertCircle className="w-8 h-8 text-danger" />
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('error')}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-2">
          {t('retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const t = useTranslations('common');
  return (
    <div className="card flex flex-col items-center justify-center text-center py-10 gap-2">
      <Inbox className="w-8 h-8 text-slate-400" />
      <p className="text-sm text-slate-500">{message ?? t('empty')}</p>
    </div>
  );
}
