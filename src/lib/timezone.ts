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

/** Wall-clock reading of an instant in Italy: what a clock on the wall in Rome
 * shows at `d`, whatever timezone the server itself runs in (UTC on Vercel). */
export type AppWallClock = {
  /** Full year, e.g. 2026. */
  year: number;
  /** 1-based, like the "MM" in toAppDateString — NOT a 0-based Date month index. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
};

const wallClockFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** What the clock in Italy reads at instant `d`. */
export function toAppWallClock(d: Date): AppWallClock {
  const parts: Record<string, string> = {};
  for (const part of wallClockFormatter.formatToParts(d)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Some ICU builds render midnight as "24" under hour12:false; the modulo
    // maps it back to 0 without affecting any other hour.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
    // Milliseconds carry no timezone: the same value in every zone.
    ms: d.getMilliseconds(),
  };
}

/** Offset of Italian wall-clock time from UTC at instant `d`, in milliseconds
 * (+2h in summer, +1h in winter). */
function appOffsetMsAt(d: Date): number {
  const w = toAppWallClock(d);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second, w.ms) - d.getTime();
}

/**
 * Inverse of toAppWallClock: the instant at which the clock in Italy reads
 * these components. Never use `new Date(year, month, day, ...)` for this — that
 * constructor reads the SERVER's timezone (UTC on Vercel), so "1 September,
 * 00:00" would become 02:00 in Italy and silently drop the first two hours of
 * the month.
 *
 * The offset depends on the instant we are looking for, which is what we are
 * computing, so it is resolved in two passes: guess with the offset in force
 * at the naive instant, then re-read the offset at that guess. The second pass
 * is what makes the DST changeover days correct; a third would never differ,
 * since Italy's offset changes at most once between two instants an hour
 * apart. On the one hour per year that does not exist (02:00-03:00 on the
 * spring-forward Sunday) this lands on the following hour, which is the
 * standard behaviour and harmless here: no window boundary is defined by it.
 * The mirror case (02:00-03:00 on the autumn Sunday, which happens twice)
 * resolves to the first occurrence, likewise harmless for the same reason.
 */
export function fromAppWallClock(w: AppWallClock): Date {
  const naive = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second, w.ms);
  const firstPass = new Date(naive - appOffsetMsAt(new Date(naive)));
  return new Date(naive - appOffsetMsAt(firstPass));
}

/** Number of days in an Italian calendar month (1-based `month`). Day 0 of the
 * next month is, by definition, the last day of this one. Built in UTC so the
 * server's own timezone can never shift the answer; a calendar month's length
 * is the same in every timezone. */
export function daysInAppMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Shifts a 1-based (year, month) pair back by `months`, rolling the year over
 * correctly for any shift. Kept separate from Date arithmetic on purpose: this
 * never carries a day-of-month across the shift, so it cannot suffer the
 * setMonth() overflow ("Feb 31" silently becoming "Mar 3"). */
export function shiftAppMonth(year: number, month: number, months: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) - months;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}
