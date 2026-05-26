import createMiddleware from 'next-intl/middleware';
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { authConfig } from './auth.config';

const intlMiddleware = createMiddleware(routing);

// Edge-safe NextAuth instance (authConfig has no Node-only imports).
const { auth } = NextAuth(authConfig);

// Bridge mode: the dashboard keeps its demo fallback, so we only hard-gate the
// genuinely auth-only surfaces. Everything else flows through next-intl.
const AUTH_ONLY_PATHS = ['/onboarding', '/settings/security'];

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;

  const needsAuth = AUTH_ONLY_PATHS.some((p) => nextUrl.pathname.includes(p));
  if (needsAuth && !isAuthenticated) {
    const localeMatch = nextUrl.pathname.match(/^\/(it|en)(\/|$)/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/login`, nextUrl));
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
