'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales } from '@/i18n/config';
import { Globe } from 'lucide-react';
import { useTransition } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Globe className="h-4 w-4" aria-hidden />
      <select
        value={locale}
        onChange={(e) => {
          const next = e.target.value as (typeof locales)[number];
          startTransition(() => router.replace(pathname, { locale: next }));
        }}
        className="bg-transparent focus:outline-none"
        aria-label="Language"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {l.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
