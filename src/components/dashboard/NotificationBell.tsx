'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function NotificationBell({ count = 0 }: { count?: number }) {
  const t = useTranslations('topbar');
  return (
    <Popover>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">{t('notificationsTitle')}</h3>
        </div>
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          {t('notificationsEmpty')}
        </div>
        <div className="px-4 py-2 border-t border-border">
          <Link
            href="/settings/notifications"
            className="text-xs text-primary hover:underline"
          >
            {t('notificationsSettings')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
