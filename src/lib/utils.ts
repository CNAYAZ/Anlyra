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
