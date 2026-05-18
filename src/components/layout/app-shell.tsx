'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Database, FileUp, History, LayoutDashboard, PencilLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n/config';

export function AppShell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const nav = useTranslations('nav');
  const app = useTranslations('app');
  const pathname = usePathname();

  const links = [
    {
      href: `/${locale}`,
      label: nav('dashboard'),
      icon: LayoutDashboard,
    },
    {
      href: `/${locale}/data/import`,
      label: nav('dataImport'),
      icon: FileUp,
    },
    {
      href: `/${locale}/data/manual`,
      label: nav('dataManual'),
      icon: PencilLine,
    },
    {
      href: `/${locale}/data/history`,
      label: nav('dataHistory'),
      icon: History,
    },
  ];

  return (
    <div className="min-h-screen bg-background-light">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <div className="font-heading text-base font-bold text-primary leading-tight">
              {app('name')}
            </div>
            <div className="text-xs text-muted-foreground">{app('tagline')}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {links.map((l) => {
            const isData = l.href.includes('/data/');
            const active = isData
              ? pathname?.startsWith(l.href)
              : pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-accent/10 text-primary-accent'
                    : 'text-primary hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          <LocaleSwitcher currentLocale={locale} />
        </div>
      </aside>
      <main className="md:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}

function LocaleSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const pathname = usePathname() ?? '/';
  const other: Locale = currentLocale === 'it' ? 'en' : 'it';
  const stripped = pathname.replace(/^\/(it|en)/, '') || '/';
  return (
    <div className="flex items-center justify-between">
      <span>{currentLocale.toUpperCase()}</span>
      <Link
        href={`/${other}${stripped}`}
        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
      >
        {other.toUpperCase()}
      </Link>
    </div>
  );
}
