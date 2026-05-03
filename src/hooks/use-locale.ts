'use client';

import { useLocale as useNextIntlLocale } from 'next-intl';
import type { Locale } from '@/lib/utils';

export function useAppLocale(): Locale {
  const l = useNextIntlLocale();
  return l === 'en' ? 'en' : 'it';
}
