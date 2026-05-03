'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { routing, type Locale } from '@/i18n/routing';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const localeLabels: Record<Locale, { flag: string; label: string }> = {
  it: { flag: '🇮🇹', label: 'IT' },
  en: { flag: '🇬🇧', label: 'EN' },
};

export function LanguageSwitch() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('topbar');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleChange = (next: Locale) => {
    setOpen(false);
    router.replace(pathname, { locale: next });
  };

  const current = localeLabels[locale];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t('toggleLanguage')}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline font-medium">{current.label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-border bg-popover shadow-md overflow-hidden z-50">
          {routing.locales.map((l) => {
            const info = localeLabels[l];
            const active = l === locale;
            return (
              <button
                key={l}
                type="button"
                onClick={() => handleChange(l)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors',
                  active && 'bg-muted font-medium',
                )}
              >
                <span className="text-base leading-none">{info.flag}</span>
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
