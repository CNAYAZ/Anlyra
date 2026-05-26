import type { NextAuthConfig } from 'next-auth';

// Edge-safe base config shared between the middleware and the full Node config.
// MUST NOT import Prisma, bcrypt, speakeasy or any Node-only module:
// the middleware bundles this for the Edge runtime.
export const authConfig = {
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    verifyRequest: '/verify-email',
  },
  session: { strategy: 'jwt' },
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
