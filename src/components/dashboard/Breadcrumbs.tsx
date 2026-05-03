'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { mainNav, footerNav, type NavItemConfig } from './nav-config';

interface Crumb {
  label: string;
  href?: string;
}

const allNav = [...mainNav, ...footerNav];

function findTrail(
  pathname: string,
  items: NavItemConfig[],
  acc: NavItemConfig[] = [],
): NavItemConfig[] | null {
  for (const item of items) {
    const next = [...acc, item];
    if (item.href === pathname) return next;
    if (item.children) {
      const found = findTrail(pathname, item.children, next);
      if (found) return found;
    }
  }
  return null;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations();

  const trail = findTrail(pathname, allNav) ?? [];

  const crumbs: Crumb[] = [
    { label: t('breadcrumb.dashboard'), href: '/' },
    ...trail
      .filter((item) => item.href !== '/')
      .map((item) => ({
        label: t(item.labelKey),
        href: item.href,
      })),
  ];

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm overflow-hidden"
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <div key={`${crumb.href ?? crumb.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            {isLast || !crumb.href ? (
              <span className="font-medium truncate text-foreground">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="truncate text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
