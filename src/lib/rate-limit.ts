import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiting for sensitive endpoints, backed by Upstash Redis so the counters
 * are SHARED across Vercel's ephemeral serverless instances (an in-memory
 * counter would be useless there).
 *
 * ── WHY THIS FILE IS NOT SIMPLY "FAIL-OPEN" ANY MORE ──
 * It used to return { success: true } whenever the limiter could not be
 * consulted — missing env vars OR a failed Redis call. That turned an Upstash
 * outage into a SILENT, TOTAL removal of every anti-abuse protection: password
 * brute force, signup floods, AI credit burning and email bombing all became
 * unlimited, with nothing but a console warning to show for it.
 *
 * The founder's decision is a DIFFERENTIATED policy, declared per bucket below:
 *   • FAIL-CLOSED where abuse costs real money or compromises an account —
 *     authentication, anything that calls the AI model, anything that sends
 *     email. If the limit cannot be verified, the request is REFUSED.
 *   • FAIL-OPEN for everything else — reads, navigation, cheap public
 *     endpoints. An Upstash outage must not take the site down.
 *
 * The classification lives HERE, next to the limits, and nowhere else: a route
 * only calls checkRateLimit() and reacts to the result. That is deliberate —
 * a policy scattered across twenty route files is a policy nobody can audit.
 */

/** What to do when the limiter cannot be consulted at all. */
type FailureMode =
  /** Refuse the request. For auth, AI spend and outbound email. */
  | 'closed'
  /** Let the request through. For reads and cheap public endpoints. */
  | 'open';

type BucketConfig = {
  /** Max requests allowed inside `window`. */
  limit: number;
  /** Sliding window, in @upstash/ratelimit's duration syntax. */
  window: `${number} ${'s' | 'm' | 'h'}`;
  /** Policy when Upstash is unconfigured or unreachable. */
  onFailure: FailureMode;
};

/**
 * Every rate-limited action in the app, with its limit and its failure policy.
 *
 * Limits are chosen to be invisible to a real user and awkward for a script:
 * public endpoints are tighter (no account to lose, so abuse is cheap for the
 * attacker), authenticated ones are looser (a real person doing real work must
 * never hit them).
 */
const BUCKETS = {
  // ── AUTHENTICATION — fail-closed ────────────────────────────────────────
  // An unverifiable limiter here means unlimited password guessing.
  // login/precheck: generous per-IP (tolerates typos / shared NAT) + tighter per-email
  'login-ip': { limit: 10, window: '10 m', onFailure: 'closed' },
  'login-email': { limit: 5, window: '15 m', onFailure: 'closed' },
  // account creation (sends a verification email each time)
  'register-ip': { limit: 5, window: '1 h', onFailure: 'closed' },
  // password reset request (sends an email — anti email-bombing)
  'forgot-ip': { limit: 5, window: '15 m', onFailure: 'closed' },
  'forgot-email': { limit: 3, window: '1 h', onFailure: 'closed' },
  // reset token submission (token brute force — defence in depth)
  'reset-ip': { limit: 10, window: '15 m', onFailure: 'closed' },
  // email existence probe (enumeration)
  'email-status-ip': { limit: 20, window: '10 m', onFailure: 'closed' },
  // second factor code brute force
  '2fa-ip': { limit: 5, window: '10 m', onFailure: 'closed' },

  // NEW — email verification link. Public GET that looks a token up directly
  // (`findUnique({ where: { emailVerifyToken } })`), so it is a token-guessing
  // oracle with no other protection. 20/10m per IP: a real user clicks the link
  // once, maybe twice if the first tab errored.
  'verify-email-ip': { limit: 20, window: '10 m', onFailure: 'closed' },

  // NEW — change password. Authenticated, but it bcrypt-compares the CURRENT
  // password, so a hijacked session (or a shared computer) can brute-force it.
  // 10/15m is far above honest use: you type your own password right the first
  // or second time.
  'change-password-user': { limit: 10, window: '15 m', onFailure: 'closed' },

  // NEW — disabling 2FA. Also a bcrypt.compare against the account password,
  // and succeeding here REMOVES a security control, so it is stricter than
  // change-password: 5/15m.
  '2fa-disable-user': { limit: 5, window: '15 m', onFailure: 'closed' },

  // NEW — starting 2FA setup (generates a secret + QR each call). Cheap but
  // authenticated and security-adjacent; 10/10m stops a loop, never a person.
  '2fa-setup-user': { limit: 10, window: '10 m', onFailure: 'closed' },

  // ── OUTBOUND EMAIL — fail-closed ────────────────────────────────────────
  // Every send costs money and burns the sending domain's reputation.
  // Bug report submission (sends an email to the contact address).
  'bug-report-ip': { limit: 5, window: '15 m', onFailure: 'closed' },
  'bug-report-user': { limit: 3, window: '1 h', onFailure: 'closed' },

  // NEW — onboarding, which sends ONE INVITE EMAIL PER ENTRY in a caller-supplied
  // array (see the route: `for (const inv of invites)`), to arbitrary addresses,
  // with the inviter's name in the subject. That is a spam cannon with a return
  // address. Onboarding is completed once per organization, so 3/1h per user is
  // already generous — it exists to bound retries, not normal use.
  'onboarding-user': { limit: 3, window: '1 h', onFailure: 'closed' },

  // ── AI MODEL CALLS — fail-closed ────────────────────────────────────────
  // Each call is billed by Anthropic. Shared by /api/ai/analyze and
  // /api/ai/insights/generate; keyed per IP+org.
  'ai-analyze': { limit: 20, window: '10 m', onFailure: 'closed' },

  // NEW — per-alert AI explanation. Was the ONLY model-calling route with no
  // rate limit at all: credits alone bounded it, and credits can be topped up.
  // 20/10m matches ai-analyze, since a request is a request.
  'ai-alert-analyze': { limit: 20, window: '10 m', onFailure: 'closed' },

  // ── EVERYTHING ELSE — fail-open ─────────────────────────────────────────
  // Reads and cheap endpoints: an Upstash outage must not break the site.
  // PDF generation (CPU-heavy) — DoS guard. Authenticated use is keyed per
  // IP+org; the public share download shares this budget under a 'share:' key.
  'report-generate-ip': { limit: 10, window: '10 m', onFailure: 'open' },
  // public share-link resolution — guards against brute-forcing share tokens
  'share-token-ip': { limit: 30, window: '10 m', onFailure: 'open' },

  // NEW — public exchange-rate proxy. Calls a third-party API; it has a cache,
  // but that cache is per serverless instance, so a burst still fans out. No
  // auth, no cost to us beyond the upstream quota → fail-open, tight-ish limit.
  'exchange-rates-ip': { limit: 60, window: '10 m', onFailure: 'open' },
} as const satisfies Record<string, BucketConfig>;

export type RateLimitAction = keyof typeof BUCKETS;

/** Why a request was allowed or refused — drives the message the user sees. */
export type RateLimitReason =
  /** Within the limit (or a fail-open bucket riding out an outage). */
  | 'ok'
  /** The caller genuinely exceeded the window. Their fault, retry later. */
  | 'limited'
  /** The limiter could not be consulted and the bucket is fail-closed. NOT the
   *  caller's fault — they must be told to retry shortly, not that they were
   *  abusing the service. */
  | 'unavailable';

export type RateLimitResult = {
  success: boolean;
  /** Remaining requests in the current window, or -1 when not measurable. */
  remaining: number;
  /** Epoch ms at which the window resets, or 0 when not measurable. */
  reset: number;
  reason: RateLimitReason;
};

// Lazily-built singletons. redis === null means "env vars missing".
let redis: Redis | null | undefined;
const limiters = new Map<RateLimitAction, Ratelimit>();

/** Logged once per process, not once per request — an outage must not self-DoS the logs. */
let warnedUnconfigured = false;

/**
 * The searchable marker for "the rate limiter did not work".
 *
 * Grep this one string in the Vercel logs to find every occurrence, of either
 * kind. Nothing sensitive is ever attached to it: no email address, no full IP,
 * no request body — only the bucket name and the policy that was applied.
 */
const UNAVAILABLE_TAG = '[rate-limit:unavailable]';

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.error(
        `${UNAVAILABLE_TAG} cause=unconfigured UPSTASH_REDIS_REST_URL/TOKEN missing. ` +
          'Fail-closed buckets (auth, AI, email) will REFUSE requests; fail-open buckets pass.',
      );
    }
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
  const { limit, window } = BUCKETS[action];
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `rl:${action}`,
    analytics: false,
  });
  limiters.set(action, limiter);
  return limiter;
}

/**
 * Apply the bucket's declared policy when the limit could not be verified.
 * `cause` distinguishes the two failure modes for the log line — they are
 * genuinely different problems: 'unconfigured' is a deployment mistake that
 * will not fix itself, 'error' is usually a transient outage.
 */
function onUnverifiable(action: RateLimitAction, cause: 'unconfigured' | 'error'): RateLimitResult {
  const mode = BUCKETS[action].onFailure;
  // 'unconfigured' is already reported once by getRedis(); logging it again per
  // request would flood the logs during an outage. A live 'error' is logged
  // every time because each one is a distinct incident.
  if (cause === 'error') {
    console.error(`${UNAVAILABLE_TAG} cause=error action=${action} policy=${mode}`);
  }
  if (mode === 'closed') {
    return { success: false, remaining: -1, reset: 0, reason: 'unavailable' };
  }
  return { success: true, remaining: -1, reset: 0, reason: 'ok' };
}

/**
 * Consume one token for `identifier` under `action`.
 *
 * Three outcomes, and callers must tell them apart (see RateLimitReason):
 *   success:true                        → proceed
 *   success:false, reason 'limited'     → 429, the caller really is over the limit
 *   success:false, reason 'unavailable' → 503, OUR problem, ask them to retry soon
 */
export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string,
): Promise<RateLimitResult> {
  let limiter: Ratelimit | null;
  try {
    limiter = getLimiter(action);
  } catch (err) {
    // Constructing the client can itself throw (malformed URL in the env var).
    console.error(`${UNAVAILABLE_TAG} cause=error action=${action} stage=construct:`, err);
    return onUnverifiable(action, 'error');
  }
  if (!limiter) return onUnverifiable(action, 'unconfigured');

  try {
    const res = await limiter.limit(identifier);
    return {
      success: res.success,
      remaining: res.remaining,
      reset: res.reset,
      reason: res.success ? 'ok' : 'limited',
    };
  } catch (err) {
    // Network failure, Upstash 5xx, timeout… The identifier is NOT logged: it
    // can be an email address or an IP.
    console.error(`${UNAVAILABLE_TAG} cause=error action=${action} stage=limit:`, err);
    return onUnverifiable(action, 'error');
  }
}

/** Seconds until the window resets, for a Retry-After header (min 1). */
export function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

/**
 * Retry-After for a refusal caused by an OUTAGE rather than by abuse. There is
 * no window to wait for in that case (`reset` is 0), so we suggest a short,
 * fixed pause instead of the 1 second retryAfterSeconds(0) would produce.
 */
export const UNAVAILABLE_RETRY_AFTER_SECONDS = 30;

/**
 * Client IP for rate-limit keys.
 *
 * VERIFIED against Vercel's own source: their official `ipAddress()` helper in
 * @vercel/functions reads exactly this header — `export const IP_HEADER_NAME =
 * 'x-real-ip'`. So preferring x-real-ip is not a guess, it is the same header
 * the platform itself treats as authoritative, and it is set by the proxy
 * rather than accepted from the client.
 * (NextRequest.ip is not an option: it was removed in Next 15, and this project
 * is on Next 16.)
 *
 * The left-most x-forwarded-for entry is only a fallback for non-Vercel hosting
 * and local dev. It is CLIENT-CONTROLLED — anyone can send an arbitrary XFF to
 * rotate their key and evade a per-IP limit — so it must never take precedence
 * over x-real-ip.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }

  // Last resort. Note what this means: EVERY caller without an identifiable IP
  // shares this ONE key, so they also share one budget — a handful of them can
  // exhaust it and lock each other out. That is the safer failure (it limits
  // too much rather than too little), but it should never happen on Vercel,
  // where x-real-ip is always present. Logged under the same searchable tag so
  // that if it ever does happen, it is visible instead of silent.
  console.error(`${UNAVAILABLE_TAG} cause=no-client-ip — all such callers share one rate-limit key`);
  return 'unknown';
}
