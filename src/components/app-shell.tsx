'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';
import { PlanSwitcher } from '@/components/plan-switcher';
import { LayoutDashboard, Settings, Sparkles, Users, Shield, Bell, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, key: 'dashboard' as const },
  { href: '/ai/agent', icon: Bot, key: 'aiAgent' as const },
  { href: '/settings/security', icon: Shield, key: 'security' as const },
  { href: '/settings/team', icon: Users, key: 'team' as const },
  { href: '/settings/notifications', icon: Bell, key: 'notifications' as const }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const tc = useTranslations('common');
  const tn = {
    dashboard: tc('dashboard'),
    settings: tc('settings'),
    aiAgent: 'AI Agent',
    security: 'Security',
    team: 'Team',
    notifications: 'Notifications'
  };
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border bg-card">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-heading text-base font-bold text-primary">{tc('appName')}</span>
          </Link>
          <div className="flex items-center gap-3">
            <PlanSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="container grid gap-6 py-6 md:grid-cols-[220px_1fr]">
        <aside>
          <nav className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tn[item.key]}</span>
                </Link>
              );
            })}
            <div className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground">
              <Settings className="h-4 w-4" />
              <span>{tc('settings')}</span>
            </div>
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
