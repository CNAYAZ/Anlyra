'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSidebarStore } from '@/store/sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { CreditsCounter } from './CreditsCounter';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitch } from './LanguageSwitch';
import { UserMenu } from './UserMenu';

export function Topbar() {
  const t = useTranslations('topbar');
  const toggleMobile = useSidebarStore((s) => s.toggleMobile);
  const unreadCount = 0;

  return (
    <header className="sticky top-0 z-30 flex h-topbar items-center gap-5 border-b border-border/60 bg-card/95 backdrop-blur-sm px-6">
      <button
        type="button"
        aria-label={t('openSidebar')}
        onClick={toggleMobile}
        className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <CreditsCounter />
        <NotificationBell count={unreadCount} />
        <LanguageSwitch />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
