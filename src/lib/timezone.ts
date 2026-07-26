/**
 * Single source of truth for the timezone used to interpret calendar dates
 * (due dates, overdue-day counts) as the user in Italy sees them, independent
 * of the server's own local timezone.
 */
export const APP_TIME_ZONE = 'Europe/Rome';

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIME_ZONE });

/** Calendar date (YYYY-MM-DD) of `d` in Italy, regardless of the server's timezone. */
export function toAppDateString(d: Date): string {
  return dateKeyFormatter.format(d);
}

/** UTC-anchored midnight of the Italian calendar day `d` falls on — for whole-day-diff arithmetic. */
export function appDateStartUTC(d: Date): Date {
  return new Date(`${toAppDateString(d)}T00:00:00.000Z`);
}
