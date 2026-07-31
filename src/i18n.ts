import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['it', 'en'] as const;
export const defaultLocale = 'it';
export type Locale = (typeof locales)[number];

// NOTA: file NON usato. La configurazione next-intl attiva e' src/i18n/request.ts,
// indicata esplicitamente al plugin in next.config.mjs. Resta qui solo come
// residuo storico: da next-intl 4 `getRequestConfig` deve restituire anche
// `locale`, quindi il return e' stato adeguato per far compilare il progetto.
export default getRequestConfig(async ({ locale }) => {
  if (!locale || !locales.includes(locale as Locale)) notFound();

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
