'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function NotificationBell({ count = 0 }: { count?: number }) {
  const t = useTranslations('topbar');
  return (
    <button
      type="button"
      aria-label={t('notifications')}
      className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
