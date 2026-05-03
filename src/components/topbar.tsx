'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BarChart3, Sparkles, MessageSquare, Lightbulb } from 'lucide-react';
import { CreditsBadge } from './credits-badge';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', labelKey: 'dashboard' as const, icon: BarChart3 },
  { href: '/ai/chat', labelKey: 'chat' as const, icon: MessageSquare },
  { href: '/ai/insights', labelKey: 'insights' as const, icon: Lightbulb },
];

export function Topbar({ companyName }: { companyName: string }) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="flex h-14 items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-heading text-base font-semibold text-primary">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          Pro
          <span className="hidden text-xs font-normal text-muted-foreground md:inline">· {companyName}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                  active ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <CreditsBadge />
        </div>
      </div>
    </header>
  );
}
