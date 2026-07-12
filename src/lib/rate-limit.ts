import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiting for sensitive (mostly auth) endpoints, backed by Upstash Redis
 * so the counters are SHARED across Vercel's ephemeral serverless instances (an
 * in-memory counter would be useless there).
 *
 * FAIL-OPEN by design: if the Upstash env vars are missing or Redis is
 * unreachable, checkRateLimit() returns { success: true } and logs a warning.
 * A limiter outage must never lock every user out of login.
 */

// Per-action sliding windows (from the A3 plan). Tuple: [maxRequests, window].
const WINDOWS = {
  // login/precheck: generous per-IP (tolerates typos / shared NAT) + tighter per-email
  'login-ip': [10, '10 m'],
  'login-email': [5, '15 m'],
  // account creation (sends a verification email each time)
  'register-ip': [5, '1 h'],
  // password reset request (sends an email — anti email-bombing)
  'forgot-ip': [5, '15 m'],
  'forgot-email': [3, '1 h'],
  // reset token submission (token brute force — defence in depth)
  'reset-ip': [10, '15 m'],
  // email existence probe (enumeration)
  'email-status-ip': [20, '10 m'],
  // second factor code brute force
  '2fa-ip': [5, '10 m'],
  // public, unauthenticated PDF generation (CPU-heavy) — DoS guard, per IP
  'report-generate-ip': [10, '10 m'],
  // AI analysis (expensive Anthropic calls) — per IP+org, abuse guard
  'ai-analyze': [20, '10 m'],
} as const;

export type RateLimitAction = keyof typeof WINDOWS;

export type RateLimitResult = {
  success: boolean;
  /** Remaining requests in the current window, or -1 when the limiter is disabled. */
  remaining: number;
  /** Epoch ms at which the window resets, or 0 when the limiter is disabled. */
  reset: number;
};

// Lazily-built singletons. redis === null means "limiter disabled" (env missing).
let redis: Redis | null | undefined;
const limiters = new Map<RateLimitAction, Ratelimit>();

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn('[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting DISABLED (fail-open).');
    redis = null;
    return redis;
  }
  redis = new Redis({ url, token });
  return redis;
}

function getLimiter(action: RateLimitAction): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;
  const existing = limiters.get(action);
  if (existing) return existing;
  const [max, window] = WINDOWS[action];
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(max, window),
    prefix: `rl:${action}`,
    analytics: false,
  });
  limiters.set(action, limiter);
  return limiter;
}

/**
 * Consume one token for `identifier` under `action`.
 * Returns success:false when the caller has exceeded the window.
 * On ANY error (or when the limiter is disabled) it FAILS OPEN (success:true).
 */
export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string,
): Promise<RateLimitResult> {
  try {
    const limiter = getLimiter(action);
    if (!limiter) return { success: true, remaining: -1, reset: 0 };
    const res = await limiter.limit(identifier);
    return { success: res.success, remaining: res.remaining, reset: res.reset };
  } catch (err) {
    console.warn(`[rate-limit] limiter error for ${action} — failing open:`, err);
    return { success: true, remaining: -1, reset: 0 };
  }
}

/** Seconds until the window resets, for a Retry-After header (min 1). */
export function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

/**
 * Client IP for rate-limit keys.
 *
 * Prefer x-real-ip: on Vercel it is set by the platform to the true client IP
 * and cannot be forged via a client-supplied x-forwarded-for. The left-most
 * x-forwarded-for entry is only a fallback (other hosts / local dev), because a
 * client can inject arbitrary XFF values to rotate the key and evade per-IP
 * limits. 'unknown' is the last resort so the limiter still has a stable key.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}
