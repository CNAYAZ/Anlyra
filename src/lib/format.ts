import type { Locale } from '@/i18n/config';

function tag(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'it-IT';
}

export function formatNumber(value: number, locale: Locale, opts?: Intl.NumberFormatOptions) {
  if (!Number.isFinite(value)) value = 0;
  return new Intl.NumberFormat(tag(locale), opts).format(value);
}

export function formatCurrency(value: number, locale: Locale, currency = 'EUR') {
  return formatNumber(value, locale, { style: 'currency', currency });
}

export function formatCompactCurrency(value: number, locale: Locale, currency = 'EUR') {
  return formatNumber(value, locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  });
}

export function formatPercent(value: number, locale: Locale, digits = 1) {
  // Accept either 0-1 fraction or 0-100 percentage; treat values >1 as already percent.
  const v = Math.abs(value) > 1 ? value / 100 : value;
  return new Intl.NumberFormat(tag(locale), {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
}

export function formatDate(value: Date | string, locale: Locale) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(tag(locale), { dateStyle: 'medium' }).format(d);
}

export function formatDateTime(value: Date | string, locale: Locale) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(tag(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function formatRelative(value: Date | string, locale: Locale): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  const now = Date.now();
  const diffSec = Math.round((d.getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(tag(locale), { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86_400 * 7) return rtf.format(Math.round(diffSec / 86_400), 'day');
  if (abs < 86_400 * 30) return rtf.format(Math.round(diffSec / (86_400 * 7)), 'week');
  if (abs < 86_400 * 365) return rtf.format(Math.round(diffSec / (86_400 * 30)), 'month');
  return rtf.format(Math.round(diffSec / (86_400 * 365)), 'year');
}

export function parseLocaleNumber(raw: string, locale: Locale): number | null {
  if (!raw) return null;
  const cleaned =
    locale === 'it' ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
