import createMiddleware from 'next-intl/middleware';
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { authConfig } from './auth.config';

const intlMiddleware = createMiddleware(routing);

// Edge-safe NextAuth instance (authConfig has no Node-only imports).
const { auth } = NextAuth(authConfig);

// All dashboard and post-auth routes. Public routes (/login, /signup, /pricing,
// /legal, /verify-email, /forgot-password, /reset-password, /invite, /share)
// are not listed here and flow through next-intl without an auth gate.
// The demo fallback in getCurrentContext remains in code but is unreachable
// for any path listed here.
const AUTH_ONLY_PATHS = [
  '/overview',
  '/finance',
  '/market',
  '/operations',
  '/settings',
  '/onboarding',
  '/ai',
  '/custom-dashboards',
  '/data',
  '/integrations',
  '/reports',
  '/welcome',
];

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
