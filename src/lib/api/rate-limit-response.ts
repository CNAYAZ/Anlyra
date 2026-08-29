import { NextResponse } from 'next/server';
import {
  retryAfterSeconds,
  UNAVAILABLE_RETRY_AFTER_SECONDS,
  type RateLimitResult,
} from '@/lib/rate-limit';

/**
 * The single place that turns a failed rate-limit check into an HTTP response.
 *
 * There are TWO different refusals and the user must not be shown the same
 * thing for both:
 *
 *   • 'limited'     → 429 RATE_LIMITED. The caller really did make too many
 *                     requests. Telling them to slow down is accurate.
 *   • 'unavailable' → 503 RATE_LIMIT_UNAVAILABLE. The limiter is down and the
 *                     bucket is fail-closed, so we refused a request that was
 *                     probably perfectly legitimate. Blaming the user for
 *                     "too many requests" here would be a lie, and would send
 *                     them hunting for a problem on their side that does not
 *                     exist. 503 is also the honest status: the service is
 *                     temporarily unable to handle the request.
 *
 * Both carry Retry-After. For an outage there is no window to wait out
 * (`reset` is 0), so a short fixed pause is suggested instead.
 */
export function rateLimitResponse(rl: RateLimitResult) {
  if (rl.reason === 'unavailable') {
    return NextResponse.json(
      { success: false, error: 'RATE_LIMIT_UNAVAILABLE' },
      { status: 503, headers: { 'Retry-After': String(UNAVAILABLE_RETRY_AFTER_SECONDS) } },
    );
  }
  return NextResponse.json(
    { success: false, error: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(rl.reset)) } },
  );
}

/**
 * Same decision, but in the BARE shape the auth routes have always used:
 * `{ error: '…' }` with no `success` field.
 *
 * The auth endpoints (precheck, register, forgot/reset-password, email-status,
 * 2FA verify) predate the ok()/fail() envelope and their clients read
 * `body.error` directly. Forcing them onto the envelope here would be a
 * gratuitous breaking change to the login flow — the riskiest place in the app
 * to break — so the two shapes are kept and the CHOICE between them is made
 * once, here, instead of in each route.
 */
export function authRateLimitResponse(rl: RateLimitResult) {
  if (rl.reason === 'unavailable') {
    return NextResponse.json(
      { error: 'RATE_LIMIT_UNAVAILABLE' },
      { status: 503, headers: { 'Retry-After': String(UNAVAILABLE_RETRY_AFTER_SECONDS) } },
    );
  }
  return NextResponse.json(
    { error: 'TOO_MANY_REQUESTS' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(rl.reset)) } },
  );
}
