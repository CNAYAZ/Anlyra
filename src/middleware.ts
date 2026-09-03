import createMiddleware from 'next-intl/middleware';
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { authConfig } from './auth.config';

const intlMiddleware = createMiddleware(routing);

// Edge-safe NextAuth instance (authConfig has no Node-only imports).
const { auth } = NextAuth(authConfig);

// All dashboard and post-auth routes. Public routes (/login, /signup, /pricing,
// /legal, /verify-email, /welcome, /forgot-password, /reset-password, /invite,
// /share) are not listed here and flow through next-intl without an auth gate.
// /welcome is intentionally public: verify-email redirects there before a session
// exists, and the page is session-optional (renders a generic greeting). The
// sensitive next step, /onboarding, stays gated below.
//
// /scadenzario, /situazione e /spese-ricorrenti mancavano da questo elenco: vivono
// nel gruppo (dashboard) come gli altri, ma il middleware non li proteggeva, quindi
// un visitatore senza login li apriva e — attraverso il vecchio ripiego sulla demo —
// leggeva i numeri inventati dell'organizzazione demo. Aggiunti.
// Non serve una voce separata in inglese: non esiste una mappa `pathnames` in
// src/i18n/routing.ts, quindi la stessa cartella risponde sia sotto /it che sotto
// /en e una sola voce per percorso copre entrambe le lingue.
//
// NOTA: il ripiego automatico sulla demo non esiste piu' (getCurrentContext ora
// solleva NotAuthenticatedError). Un percorso elencato qui resta chiuso a chi non
// ha una sessione, CON UNA ECCEZIONE VOLUTA: chi ha scelto esplicitamente la demo
// dal pulsante sulla pagina di login porta il cookie DEMO_COOKIE e passa — vedi
// `mayPass` sotto. E' la vetrina per chi non vuole registrarsi.
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
  '/scadenzario',
  '/situazione',
  '/spese-ricorrenti',
];

// Onboarding creates a real organization and sends invite emails, so it stays
// closed to a demo visitor even though the rest of the dashboard opens for them.
const DEMO_FORBIDDEN_PATHS = ['/onboarding'];

// Kept in sync with DEMO_COOKIE in src/lib/session.ts. The middleware runs on
// the Edge runtime and cannot import that module (it pulls in Prisma), so the
// name is repeated here rather than shared — the value is a constant, and a
// mismatch fails safe: the visitor is sent to /login.
const DEMO_COOKIE = 'anlyra_demo';

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;
  const inDemo = req.cookies.get(DEMO_COOKIE)?.value === '1';

  const needsAuth = AUTH_ONLY_PATHS.some((p) => nextUrl.pathname.includes(p));
  const demoForbidden = DEMO_FORBIDDEN_PATHS.some((p) => nextUrl.pathname.includes(p));

  // A demo visitor may browse the dashboard without signing in — that is the
  // whole feature — but is never treated as authenticated anywhere else.
  const mayPass = isAuthenticated || (inDemo && !demoForbidden);

  if (needsAuth && !mayPass) {
    const localeMatch = nextUrl.pathname.match(/^\/(it|en)(\/|$)/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/login`, nextUrl));
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
