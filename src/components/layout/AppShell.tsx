'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useTransition } from 'react';
import {
  LayoutDashboard,
  Wallet,
  Globe,
  Activity,
  Users,
  TrendingUp,
  HeartHandshake,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/finance', labelKey: 'nav.finance', icon: Wallet },
  // MERCATO messo a riposo il 2026-06-30 — pagine e API restano nel repo, solo nascosto dal menu. Vedi .vscode/STATO-REALE-E-VALUTAZIONE.md
  // { href: '/market', labelKey: 'nav.market', icon: Globe },
  // OPERATIONS messo a riposo il 2026-06-30 — pagine e API restano nel repo, solo nascosto dal menu. Vedi .vscode/STATO-REALE-E-VALUTAZIONE.md
  // { href: '/operations', labelKey: 'nav.operations', icon: Activity },
];

const OPS_NAV: NavItem[] = [
  { href: '/operations', labelKey: 'nav.operationsOverview', icon: Activity },
  { href: '/operations/efficiency', labelKey: 'nav.operationsEfficiency', icon: TrendingUp },
  { href: '/operations/customers', labelKey: 'nav.operationsCustomers', icon: HeartHandshake },
  { href: '/operations/team', labelKey: 'nav.operationsTeam', icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale();
  const [, startTransition] = useTransition();

  const isOps = pathname.startsWith('/operations');

  function setLocale(next: 'it' | 'en') {
    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
      window.location.reload();
    });
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="px-5 py-5 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-primary text-white grid place-items-center font-heading font-bold">
              A
            </span>
            <span className="font-heading text-lg font-semibold">{t('common.appName')}</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-white'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Link>
            );
          })}

          {isOps && (
            <div className="pt-4 mt-4 border-t border-border/50">
              <p className="px-3 pb-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {t('nav.operations')}
              </p>
              {OPS_NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        <div className="px-3 py-3 border-t border-border/50">
          <p className="px-2 text-xs text-muted-foreground mb-1">{t('common.language')}</p>
          <div className="flex gap-1">
            {(['it', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                  locale === l
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
