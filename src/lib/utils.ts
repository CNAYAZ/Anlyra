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

export function formatNumber(value: number, locale: Locale = 'it', digits = 0): string {
  if (!Number.isFinite(value)) value = 0;
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
