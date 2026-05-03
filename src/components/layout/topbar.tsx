'use client';

import { Bell, Moon, Search, Sun, User2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function Topbar() {
  const t = useTranslations('topbar');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [locale, setLocale] = useState<'it' | 'en'>('it');

  useEffect(() => {
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = typeof window !== 'undefined' ? localStorage.getItem('pro-theme') : null;
    const resolved = (stored as 'light' | 'dark' | null) ?? (prefersDark ? 'dark' : 'light');
    setTheme(resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');

    const cookieLocale = document.cookie.split('; ').find((c) => c.startsWith('NEXT_LOCALE='));
    if (cookieLocale) {
      const value = cookieLocale.split('=')[1] as 'it' | 'en';
      if (value === 'it' || value === 'en') setLocale(value);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('pro-theme', next);
  };

  const switchLocale = (value: 'it' | 'en') => {
    setLocale(value);
    document.cookie = `NEXT_LOCALE=${value}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <header className="h-16 sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 px-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={t('search')}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm border border-transparent focus:border-primary-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 text-xs overflow-hidden">
          {(['it', 'en'] as const).map((code) => (
            <button
              key={code}
              onClick={() => switchLocale(code)}
              className={
                locale === code
                  ? 'px-2.5 py-1 bg-primary-600 text-white font-medium'
                  : 'px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium uppercase'
              }
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
          aria-label="theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          className="relative w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
          aria-label={t('notifications')}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger" />
        </button>

        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-accent flex items-center justify-center text-white">
          <User2 className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}
