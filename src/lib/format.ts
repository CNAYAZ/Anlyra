import type { Locale } from '@/i18n/config';

export function formatNumber(value: number, locale: Locale, opts?: Intl.NumberFormatOptions) {
  const localeTag = locale === 'it' ? 'it-IT' : 'en-US';
  return new Intl.NumberFormat(localeTag, opts).format(value);
}

export function formatCurrency(value: number, locale: Locale, currency = 'EUR') {
  return formatNumber(value, locale, { style: 'currency', currency });
}

export function formatDate(value: Date | string, locale: Locale) {
  const localeTag = locale === 'it' ? 'it-IT' : 'en-US';
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium' }).format(d);
}

export function formatDateTime(value: Date | string, locale: Locale) {
  const localeTag = locale === 'it' ? 'it-IT' : 'en-US';
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function parseLocaleNumber(raw: string, locale: Locale): number | null {
  if (!raw) return null;
  const cleaned =
    locale === 'it'
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
