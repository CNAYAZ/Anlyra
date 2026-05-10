'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut, Settings, User } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function UserMenu() {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const router = useRouter();
  const name = t('user.name');
  const email = t('user.email');
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    console.log('[logout] handler triggered');
    setOpen(false);
    router.push(`/api/auth/logout?locale=${locale}`);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('topbar.userMenu')}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-popover shadow-md overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-border">
            <div className="font-medium text-sm truncate">{name}</div>
            <div className="text-xs text-muted-foreground truncate">{email}</div>
          </div>
          <nav className="py-1">
            <Link
              href="/settings/profile"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors',
              )}
            >
              <User className="h-4 w-4" />
              <span>{t('user.profile')}</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors',
              )}
            >
              <Settings className="h-4 w-4" />
              <span>{t('user.settings')}</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-muted transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('user.logout')}</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
