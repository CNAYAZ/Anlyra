'use client';

import { useEffect } from 'react';
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/sidebar';
import { Logo } from './Logo';
import { NavItem } from './NavItem';
import { mainNav, footerNav } from './nav-config';

export function Sidebar() {
  const t = useTranslations('topbar');
  const collapsed = useSidebarStore((s) => s.collapsed);
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setMobileOpen(false);
      } else if (window.innerWidth < 1024) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setMobileOpen, setCollapsed]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed md:sticky top-0 z-50 h-screen shrink-0 border-r border-border bg-sidebar text-sidebar-foreground',
          'transition-[width,transform] duration-200 ease-out flex flex-col',
          collapsed ? 'md:w-sidebar-collapsed' : 'md:w-sidebar-expanded',
          'w-sidebar-expanded',
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full md:translate-x-0',
        )}
      >
        <div
          className={cn(
            'flex h-topbar items-center border-b border-border shrink-0',
            collapsed ? 'justify-center px-2' : 'justify-between px-4',
          )}
        >
          <Logo collapsed={collapsed} />
          <button
            type="button"
            onClick={closeMobile}
            className="md:hidden p-1 rounded-md hover:bg-sidebar-hover"
            aria-label={t('closeSidebar')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
          {mainNav.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              collapsed={collapsed}
              onNavigate={closeMobile}
            />
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-1">
          {footerNav.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              collapsed={collapsed}
              onNavigate={closeMobile}
            />
          ))}
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              'hidden md:flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors',
              collapsed && 'justify-center',
            )}
            aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
          >
            {collapsed ? (
              <ChevronsRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronsLeft className="h-5 w-5" />
                <span>{t('collapseSidebar')}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
