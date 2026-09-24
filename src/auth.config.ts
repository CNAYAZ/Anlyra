import type { NextAuthConfig } from 'next-auth';

// Edge-safe base config shared between the middleware and the full Node config.
// MUST NOT import Prisma, bcrypt, speakeasy or any Node-only module:
// the middleware bundles this for the Edge runtime.

/**
 * How long a session stays valid without activity, in seconds.
 *
 * ── WAS: THE LIBRARY'S DEFAULT, UNDECLARED ──
 * Until this constant existed, neither `session.maxAge` nor `jwt.maxAge` was
 * set anywhere in this config, so both silently took next-auth's built-in
 * default — VERIFIED by reading the installed package, not the docs:
 * node_modules/@auth/core/lib/init.js (`const maxAge = 30 * 24 * 60 * 60;`,
 * "Sessions expire after 30 days of being idle by default"). That is not a
 * value this product ever chose; it is a library author's default for every
 * app that does not set one. A privacy policy cannot honestly declare a
 * session lifetime that no line of this codebase actually decided.
 *
 * ── TWO KNOBS, ONE VALUE ──
 * next-auth has a SEPARATE `jwt.maxAge`, which controls the `exp` claim
 * encoded inside the token itself (node_modules/@auth/core/jwt.js), distinct
 * from `session.maxAge`, which controls the browser cookie's Max-Age/Expires
 * (node_modules/@auth/core/lib/actions/callback/index.js, e.g.
 * `cookieExpires.setTime(cookieExpires.getTime() + sessionMaxAge * 1000)`).
 * By default `jwt.maxAge` falls back to `session.maxAge`
 * (node_modules/@auth/core/lib/init.js: `maxAge: config.session?.maxAge ??
 * maxAge`), so leaving `jwt` unset here would already make the two coincide
 * — but relying on that fallback is implicit, and a future major version is
 * free to change it. Both are set to this SAME constant below, explicitly,
 * so the cookie a browser holds and the expiry inside the token it carries
 * can never drift apart by accident.
 *
 * ── WHY 14 DAYS, NOT THE DEFAULT 30 ──
 * Anlyra is a daily work tool (dashboards, chat, imports) over a company's
 * real financial data — not a marketing site a visitor drops into once.
 * Re-authenticating constantly would be friction with no security benefit,
 * since the session effectively rolls forward on every authenticated
 * request: `session.js` in @auth/core re-signs the JWT with a fresh
 * `now + maxAge` expiry on every `auth()` call for the JWT strategy (no
 * `updateAge` throttling applies to this strategy — that field only affects
 * the separate database-session code path, confirmed by reading
 * node_modules/@auth/core/lib/actions/session.js). So `maxAge` is not "how
 * often an active user must log back in" — it is already close to never,
 * for someone who opens the product regularly. It is the answer to a
 * different question: for how long does an UNUSED cookie — the case that
 * actually matters, a stolen or forgotten laptop — keep working. Half the
 * default cuts that exposure window without asking anyone who uses the
 * product normally to type their password in more often than they do today.
 */
const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60; // 14 giorni

export const authConfig = {
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    verifyRequest: '/verify-email',
  },
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
  jwt: { maxAge: SESSION_MAX_AGE_SECONDS },
  providers: [], // populated with real providers in src/auth.ts (Node runtime)
  callbacks: {
    // Reads only from the decoded JWT — no DB access, so it is Edge-safe.
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      if (token.currentOrgId) session.currentOrgId = token.currentOrgId as string;
      if (token.currentOrgRole) session.currentOrgRole = token.currentOrgRole as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
