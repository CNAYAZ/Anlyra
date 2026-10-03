import { cookies } from 'next/headers';
import { peekQuota, quotaLimit } from '@/lib/rate-limit';
import { toAppDateString } from '@/lib/timezone';

/**
 * The demo chat's limits (founder's decision, 2026-10-03): an anonymous demo
 * visitor may ask a few questions about the demo company, at the founder's
 * expense, with nothing saved.
 *
 *   • 5 questions per demo SESSION — the 'demo-chat-session' quota, keyed by the
 *     random id in DEMO_CHAT_COOKIE (issued by /api/ai/chat on the first
 *     question; the demo cookie itself carries a constant, not an id).
 *   • 15 questions a day per IP — the 'demo-chat-ip' bucket. A new session costs
 *     nothing to open (clear the cookies, press the button again), so this
 *     slows a single source down.
 *   • 30 questions a day for the whole demo — the 'demo-chat-day' quota, one
 *     counter per Italian calendar day (DEMO_CHAT_DAILY_CAP in rate-limit.ts).
 *     The only ceiling that holds against many IPs: it bounds the daily cost.
 *     A visitor who meets it is shown the same invitation to sign up as one
 *     who used their 5 questions, and is not told why.
 */
export const DEMO_CHAT_COOKIE = 'anlyra_demo_chat';

/** Same length as a demo visit (DEMO_SESSION_HOURS in /api/demo/start). */
export const DEMO_CHAT_COOKIE_MAX_AGE = 12 * 60 * 60;

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The visitor's demo chat id, or null when absent or not one we issued in shape. */
export async function readDemoChatSessionId(): Promise<string | null> {
  const value = (await cookies()).get(DEMO_CHAT_COOKIE)?.value ?? null;
  return value && SESSION_ID.test(value) ? value : null;
}

/** The identifier of today's counter for the whole demo (Italian calendar day). */
export function demoDayKey(now: Date = new Date()): string {
  return toAppDateString(now);
}

/**
 * Questions this visitor can still ask, for the counter: what is left in the
 * session or in today's total for the whole demo, whichever is less. null when
 * it cannot be read.
 */
export async function demoQuestionsLeft(): Promise<number | null> {
  const id = await readDemoChatSessionId();
  const [session, day] = await Promise.all([
    id ? peekQuota('demo-chat-session', id) : Promise.resolve(quotaLimit('demo-chat-session')),
    peekQuota('demo-chat-day', demoDayKey()),
  ]);
  return session === null || day === null ? null : Math.min(session, day);
}

/**
 * The key for the per-IP limit. IPv6 is grouped by /64: one connection usually
 * gets a whole /64 and can rotate through it at will, so a per-address limit
 * would not hold. IPv4 (also IPv4-mapped IPv6) is the address itself.
 */
export function demoIpKey(ip: string): string {
  const address = ip.split('%')[0];
  if (!address.includes(':')) return address;
  if (address.includes('.')) return address.slice(address.lastIndexOf(':') + 1);
  const [head, tail] = address.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups =
    tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  return `${groups
    .slice(0, 4)
    .map((g) => (parseInt(g, 16) || 0).toString(16))
    .join(':')}::/64`;
}
