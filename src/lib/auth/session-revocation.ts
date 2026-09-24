import { encode, decode } from 'next-auth/jwt';
import type { JWT } from 'next-auth/jwt';
import { authConfig } from '@/auth.config';

/**
 * "Sign out everywhere" for stateless JWT sessions.
 *
 * ── WHY NOT THE TOKEN'S OWN `iat` ──
 * Every token carries `iat`, but it is NOT the moment the session was opened:
 * @auth/core re-encodes the token on every refresh (lib/actions/session.js,
 * and the middleware on every page navigation) and its encode() calls jose's
 * setIssuedAt() with no argument (node_modules/@auth/core/jwt.js), which
 * overwrites `iat` with "now". Comparing `iat` against a revocation instant
 * would refuse a stolen token exactly once — the refused request would itself
 * be answered with a re-encoded token carrying a fresh `iat`, valid again from
 * the next request on.
 *
 * So the session carries its own claim, `sessionIssuedAt` (milliseconds), set
 * ONCE when the session is created (the jwt callback in src/auth.ts, which
 * sees `user` only at sign-in) and carried unchanged through every refresh —
 * the same way `currentOrgId` already survives them.
 */

/**
 * True when this token must no longer be honoured: its user revoked sessions
 * (User.sessionsRevokedAt) after this token's session was opened.
 *
 * A token WITHOUT the claim is treated as issued before any revocation. That
 * is exactly true, not a guess: tokens lack the claim only if they were issued
 * before this code shipped, and a revocation instant can only be written by
 * this same code. With no revocation on record (NULL, every account until it
 * first uses the feature), nothing is ever refused.
 */
export function isSessionRevoked(token: JWT, sessionsRevokedAt: Date | null): boolean {
  if (!sessionsRevokedAt) return false;
  const issuedAt = typeof token.sessionIssuedAt === 'number' ? token.sessionIssuedAt : null;
  return issuedAt === null || issuedAt < sessionsRevokedAt.getTime();
}

// Same two names @auth/core uses (lib/utils/cookie.js, defaultCookies): the
// __Secure- one over https, the plain one over http (local development).
const SESSION_COOKIE_NAMES = ['__Secure-authjs.session-token', 'authjs.session-token'] as const;

export type SessionCookie = {
  name: string;
  value: string;
  options: { httpOnly: true; sameSite: 'lax'; path: '/'; secure: boolean; expires: Date };
};

/**
 * A fresh cookie for the session making THIS request, with `sessionIssuedAt`
 * set to now — so the user who just revoked every session is not signed out
 * by their own revocation. Call it AFTER writing sessionsRevokedAt: the new
 * claim is then never earlier than the revocation instant.
 *
 * Built from the request's own token, so every other claim (user id, current
 * organization and role, name, email) is carried over unchanged. Written under
 * the same cookie name the request came with, with the same options @auth/core
 * gives it, so it replaces that cookie instead of sitting next to it.
 *
 * Returns null if the request carries no readable session cookie — then the
 * caller is simply left with its old token, which the revocation refuses: the
 * safe direction (signed out), never the unsafe one.
 */
export async function reissueCurrentSession(req: Request): Promise<SessionCookie | null> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const cookieHeader = req.headers.get('cookie') ?? '';
  const cookies = new Map(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const eq = part.indexOf('=');
        return [part.slice(0, eq), decodeURIComponent(part.slice(eq + 1))] as const;
      }),
  );

  for (const name of SESSION_COOKIE_NAMES) {
    const current = cookies.get(name);
    if (!current) continue;
    // The cookie name is the salt @auth/core derives the key with
    // (lib/actions/session.js: `salt = options.cookies.sessionToken.name`).
    const token = await decode({ token: current, secret, salt: name }).catch(() => null);
    if (!token) return null;

    const value = await encode({
      token: { ...token, sessionIssuedAt: Date.now() },
      secret,
      salt: name,
      maxAge: authConfig.jwt.maxAge,
    });
    return {
      name,
      value,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: name.startsWith('__Secure-'),
        expires: new Date(Date.now() + authConfig.session.maxAge * 1000),
      },
    };
  }
  return null;
}
