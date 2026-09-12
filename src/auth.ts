import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authConfig } from '@/auth.config';
import { checkRateLimit, resetRateLimit, getClientIp } from '@/lib/rate-limit';
import { auditLog } from '@/lib/audit/log';
import { DEMO_EMAIL } from '@/lib/session';

// Build the providers list, including OAuth only when credentials are present
// so the app boots cleanly in environments without OAuth configured.
const providers = [
  Credentials({
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
      twoFactorCode: { label: '2FA Code', type: 'text' },
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      const twoFactorCode = credentials?.twoFactorCode as string | undefined;

      if (!email || !password) return null;

      // Rate-limit brute force that bypasses /api/auth/precheck by calling the
      // credentials provider directly. Keyed by email into the SAME 'login-email'
      // bucket as precheck, so the two paths share one budget.
      //
      // 'login-email' is FAIL-CLOSED, so this now also denies when the limiter
      // itself is unreachable. That is the intended trade-off: during an Upstash
      // outage, password login is refused rather than left unmetered. NextAuth's
      // authorize() can only say yes or no — it has no channel for "try again
      // shortly" — so the outage surfaces as a failed sign-in here. The precheck
      // route the login form calls FIRST does distinguish the two cases and
      // shows the proper message (503 RATE_LIMIT_UNAVAILABLE), so in the real UI
      // the user sees the honest explanation before ever reaching this point.
      const emailLimit = await checkRateLimit('login-email', email.trim().toLowerCase());
      if (!emailLimit.success) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        // Unknown address (or an OAuth-only account): recorded WITHOUT the email.
        // Storing attempted addresses would turn the audit table into an account
        // enumeration list, which is the opposite of what it is for.
        await auditLog({ action: 'auth.login_failed', outcome: 'failure' });
        return null;
      }

      const passwordMatches = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatches) {
        await auditLog({ action: 'auth.login_failed', userId: user.id, outcome: 'failure' });
        return null;
      }

      // GDPR deletion pending: the account is closed the moment it is requested,
      // even though the rows survive for the 30-day grace period. Checked here,
      // right after the password, so a correct password no longer grants access.
      if (user.deletionRequestedAt) {
        throw new Error('ACCOUNT_DELETION_PENDING');
      }

      // Demo account: password sign-in is disabled, regardless of whether the
      // password is correct. The only legitimate way into the demo experience
      // is the read-only cookie flow behind "prova la demo" (hasDemoSession,
      // see src/lib/session.ts) — that path never reaches this provider and
      // never grants a real, writable session. A genuine NextAuth session for
      // this address would bypass that read-only boundary entirely.
      if (email.trim().toLowerCase() === DEMO_EMAIL) {
        throw new Error('DEMO_LOGIN_DISABLED');
      }

      if (!user.emailVerifiedAt) {
        throw new Error('EMAIL_NOT_VERIFIED');
      }

      if (user.twoFactorEnabledAt && user.twoFactorSecret) {
        if (!twoFactorCode) throw new Error('2FA_REQUIRED');
        const speakeasy = await import('speakeasy');
        const valid = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: twoFactorCode,
          window: 1,
        });
        if (!valid) throw new Error('2FA_INVALID');
      }

      // Authentication fully succeeded (password + deletion + verification +
      // 2FA all passed): clear the per-email brute-force budget, so signing in
      // correctly does not push the user towards their own lockout. Placed
      // HERE, after every check, so a request that got the password right but
      // failed 2FA still leaves the counter charged — that case is exactly the
      // one the limit is for.
      // Per-IP is deliberately left alone; see the note in precheck.
      await resetRateLimit('login-email', email.trim().toLowerCase());

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await auditLog({ action: 'auth.login', userId: user.id });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),

  // Second way in, used ONLY by the email-confirmation link: exchanges a valid
  // one-time emailVerifyToken for a session, so a brand-new account reaches
  // onboarding without signing in again. Its own provider id, so nothing here
  // changes the password path above.
  //
  // WHY THE VALIDATION LIVES HERE and not in the route: like every credentials
  // provider this is publicly reachable (POST /api/auth/callback/email-verify),
  // so it must prove the caller holds the secret itself. A provider that
  // trusted a user id handed to it would be a public session-minting endpoint.
  // /api/auth/verify-email is a convenience wrapper, never the boundary.
  Credentials({
    id: 'email-verify',
    credentials: { token: { label: 'Token', type: 'text' } },
    async authorize(credentials, request) {
      const token = typeof credentials?.token === 'string' ? credentials.token : '';
      if (!token) return null;

      // Repeated here for exactly the reason the password provider repeats
      // 'login-email' above: the route's limiter does not cover a direct call
      // to this endpoint, which would otherwise leave the token-guessing
      // oracle unmetered. Fail-closed, like the rest of the auth paths.
      const ipLimit = await checkRateLimit('verify-email-ip', getClientIp(request));
      if (!ipLimit.success) return null;

      const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });
      if (!user || !user.emailVerifyExpiresAt || user.emailVerifyExpiresAt < new Date()) {
        return null;
      }

      // The same three refusals as the password path, because a session is a
      // session however it was obtained. None of them can fire today: a verify
      // token is only ever written by /api/auth/register (the single write site
      // in the codebase) on a just-created account, which therefore has no 2FA
      // configured and is never the demo address. They are here so that adding
      // a "resend verification" flow later — which would hand a token to an
      // established account — cannot quietly turn this into a way around 2FA.
      if (user.deletionRequestedAt) return null;
      if (user.email?.trim().toLowerCase() === DEMO_EMAIL) return null;
      if (user.twoFactorEnabledAt && user.twoFactorSecret) return null;

      // Consume the token and mark the address verified in ONE statement, with
      // the token still required in the WHERE. Two clicks on the same link race
      // here: only one can match a row that still carries it, the other gets
      // count 0 and no session. The old two-step (findUnique, then update) left
      // that window open — harmless when it only meant "verified twice", not
      // when it mints a session.
      const consumed = await prisma.user.updateMany({
        where: { id: user.id, emailVerifyToken: token },
        data: {
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          emailVerified: user.emailVerified ?? new Date(),
          emailVerifyToken: null,
          emailVerifyExpiresAt: null,
          lastLoginAt: new Date(),
        },
      });
      if (consumed.count !== 1) return null;

      await auditLog({ action: 'auth.login', userId: user.id });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }) as never
  );
}

if (process.env.AUTH_MICROSOFT_ID && process.env.AUTH_MICROSOFT_SECRET) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ID,
      clientSecret: process.env.AUTH_MICROSOFT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_TENANT || 'common'}/v2.0`,
    }) as never
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // OAuth logins: mark the email as verified automatically.
      if (account?.provider === 'google' || account?.provider === 'microsoft-entra-id') {
        if (user.email) {
          const existing = await prisma.user.findUnique({ where: { email: user.email } });
          // Second half of the deletion block: authorize() above only guards the
          // Credentials provider, so Google/Microsoft are stopped here. Denying in
          // this callback closes the OAuth path without creating a session.
          if (existing?.deletionRequestedAt) return false;
          if (existing && !existing.emailVerifiedAt) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { emailVerifiedAt: new Date(), emailVerified: new Date() },
            });
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // Runs with `user` only at sign-in: resolve the default org once and
      // carry it in the token so the Edge session callback stays DB-free.
      if (user?.id) {
        token.sub = user.id;
        const defaultMembership =
          (await prisma.membership.findFirst({
            where: { userId: user.id, isDefault: true },
          })) ?? (await prisma.membership.findFirst({ where: { userId: user.id } }));
        if (defaultMembership) {
          token.currentOrgId = defaultMembership.organizationId;
          token.currentOrgRole = defaultMembership.role;
        }
      }
      return token;
    },
  },
});
