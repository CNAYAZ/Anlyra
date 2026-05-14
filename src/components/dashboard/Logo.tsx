'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function Logo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const t = useTranslations('app');
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={t('name')}
        className="shrink-0"
      >
        <rect width="36" height="36" rx="8" fill="#1e3a5f" />
        <path
          d="M8 10h6.2c2.8 0 4.8 1.7 4.8 4.2 0 2.6-2 4.3-4.8 4.3H11V26H8V10zm3 6.2h3c1.3 0 2.1-.8 2.1-2s-.8-2-2.1-2h-3v4zM22 26V10h3v16h-3z"
          fill="#3b82f6"
        />
      </svg>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="font-heading font-bold text-lg text-primary dark:text-primary-accent">
            {t('name')}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t('logoSubtitle')}
          </span>
        </div>
      )}
    </div>
  );
}
