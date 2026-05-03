'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { NavItemConfig } from './nav-config';

interface NavItemProps {
  item: NavItemConfig;
  collapsed: boolean;
  onNavigate?: () => void;
}

function isActiveHref(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/' || pathname === '';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavItem({ item, collapsed, onNavigate }: NavItemProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;
  const isActive = isActiveHref(pathname, item.href);
  const isChildActive = hasChildren
    ? item.children!.some((c) => isActiveHref(pathname, c.href))
    : false;

  const [open, setOpen] = useState(isActive || isChildActive);

  useEffect(() => {
    if (isActive || isChildActive) setOpen(true);
  }, [isActive, isChildActive]);

  if (collapsed) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'group relative flex h-10 w-10 items-center justify-center rounded-lg mx-auto transition-colors',
          isActive || isChildActive
            ? 'bg-sidebar-active text-primary-accent'
            : 'text-sidebar-foreground hover:bg-sidebar-hover',
        )}
        title={t(item.labelKey)}
      >
        <Icon className="h-5 w-5" />
        <span className="absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
          {t(item.labelKey)}
        </span>
      </Link>
    );
  }

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-active text-primary-accent'
            : 'text-sidebar-foreground hover:bg-sidebar-hover',
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="truncate">{t(item.labelKey)}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isChildActive
            ? 'bg-sidebar-active text-primary-accent'
            : 'text-sidebar-foreground hover:bg-sidebar-hover',
        )}
        aria-expanded={open}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 truncate text-left">{t(item.labelKey)}</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <ul className="mt-1 ml-4 border-l border-border pl-3 space-y-1">
          {item.children!.map((child) => {
            const childActive = isActiveHref(pathname, child.href);
            return (
              <li key={child.key}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  className={cn(
                    'block rounded-md px-3 py-1.5 text-sm transition-colors',
                    childActive
                      ? 'bg-sidebar-active text-primary-accent font-medium'
                      : 'text-muted-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground',
                  )}
                >
                  {t(child.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
