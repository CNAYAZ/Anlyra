'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Banknote,
  Brain,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  PiggyBank,
  Plug,
  Settings,
  Sparkles,
  TrendingDown,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  key: string;
  icon: typeof LayoutDashboard;
  indent?: boolean;
};

const NAV: NavItem[] = [
  { href: '/dashboard', key: 'overview', icon: LayoutDashboard },
  { href: '/dashboard/finance', key: 'finance', icon: BarChart3 },
  { href: '/dashboard/finance/revenue', key: 'revenue', icon: CircleDollarSign, indent: true },
  { href: '/dashboard/finance/costs', key: 'costs', icon: TrendingDown, indent: true },
  { href: '/dashboard/finance/cashflow', key: 'cashflow', icon: Wallet, indent: true },
  { href: '/dashboard/finance/budget', key: 'budget', icon: PiggyBank, indent: true },
  { href: '/data', key: 'data', icon: FileText },
  { href: '/market', key: 'market', icon: Sparkles },
  { href: '/operations', key: 'operations', icon: Users },
  { href: '/ai/chat', key: 'aiChat', icon: Brain },
  { href: '/ai/insights', key: 'aiInsights', icon: Sparkles },
  { href: '/reports', key: 'reports', icon: FileText },
  { href: '/custom-dashboards', key: 'customDashboards', icon: LayoutGrid },
  { href: '/integrations', key: 'integrations', icon: Plug },
];

export function Sidebar() {
  const t = useTranslations('nav');
  const tApp = useTranslations('app');
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-60 shrink-0 h-screen sticky top-0 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-700 to-accent flex items-center justify-center">
          <Banknote className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-heading font-semibold text-base leading-tight">{tApp('name')}</div>
          <div className="text-[11px] text-slate-500 leading-tight">Analytics</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                item.indent && 'ml-4 text-[13px]',
                isActive
                  ? 'bg-primary-600/10 text-primary-700 dark:text-primary-500'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              <Icon className={cn('w-4 h-4', item.indent && 'w-3.5 h-3.5')} />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Settings className="w-4 h-4" />
          <span>{t('settings')}</span>
        </Link>
      </div>
    </aside>
  );
}
