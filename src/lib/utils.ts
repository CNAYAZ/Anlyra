import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type StatusLevel = 'good' | 'warn' | 'bad';

export function evaluateStatus(
  value: number,
  opts: { good: number; warn: number; invert?: boolean },
): StatusLevel {
  const { good, warn, invert } = opts;
  if (invert) {
    if (value <= good) return 'good';
    if (value <= warn) return 'warn';
    return 'bad';
  }
  if (value >= good) return 'good';
  if (value >= warn) return 'warn';
  return 'bad';
}

export type Locale = 'it' | 'en' | string;

function intlLocale(locale: Locale): string {
  const l = locale?.toLowerCase() ?? 'it';
  return l.startsWith('en') ? 'en-US' : 'it-IT';
}

export function formatCurrency(value: number, locale: Locale = 'it', currency = 'EUR'): string {
  if (!Number.isFinite(value)) value = 0;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, locale: Locale = 'it', digits = 1): string {
  if (!Number.isFinite(value)) value = 0;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value / 100);
}

export function formatNumber(value: number, locale: Locale = 'it', opts: Intl.NumberFormatOptions | number = 0): string {
  if (!Number.isFinite(value)) value = 0;
  const options: Intl.NumberFormatOptions =
    typeof opts === 'number'
      ? { minimumFractionDigits: opts, maximumFractionDigits: opts }
      : opts;
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}

export function formatCurrencyCompact(value: number, locale: Locale = 'it', currency = 'EUR'): string {
  if (!Number.isFinite(value)) value = 0;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatMonth(dateStr: string, locale: Locale = 'it'): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDate(value: Date | string, locale: Locale = 'it'): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium' }).format(d);
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const STATUS_COLORS: Record<StatusLevel, string> = {
  good: 'text-green-600 dark:text-green-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-red-600 dark:text-red-400',
};
