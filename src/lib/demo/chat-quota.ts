import { cookies } from 'next/headers';
import { peekQuota, quotaLimit } from '@/lib/rate-limit';

/**
 * The demo chat's limits (founder's decision, 2026-10-03): an anonymous demo
 * visitor may ask a few questions about the demo company, at the founder's
 * expense, with nothing saved.
 *
 *   • 5 questions per demo SESSION — the 'demo-chat-session' quota, keyed by the
 *     random id in DEMO_CHAT_COOKIE (issued by /api/ai/chat on the first
 *     question; the demo cookie itself carries a constant, not an id).
 *   • 15 questions a day per IP — the 'demo-chat-ip' bucket. A new session costs
 *     nothing to open (clear the cookies, press the button again), so this is
 *     the ceiling that actually holds.
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

/** Questions left in this demo session, for the counter; null when unreadable. */
export async function demoQuestionsLeft(): Promise<number | null> {
  const id = await readDemoChatSessionId();
  if (!id) return quotaLimit('demo-chat-session');
  return peekQuota('demo-chat-session', id);
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
