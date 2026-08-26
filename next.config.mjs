import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isDev = process.env.NODE_ENV !== 'production';

/**
 * CONTENT SECURITY POLICY — shipped in REPORT-ONLY mode on purpose.
 *
 * A wrong CSP breaks a production site silently: resources stop loading, no
 * server error is raised, and the first sign of trouble is a user saying "a page
 * looks broken". So this starts as `Content-Security-Policy-Report-Only`, which
 * makes the browser LOG violations to the console while blocking nothing. After
 * a few days of real traffic with a clean console, flip CSP_ENFORCE=true (one
 * env var, no code change) to start enforcing.
 *
 * ── WHAT THE SITE ACTUALLY LOADS (audited on the code, not assumed) ──
 *  • Scripts: only Next.js' own bundles, same-origin. NO third-party script tag
 *    anywhere — notably Stripe.js is NOT loaded: checkout is a full-page
 *    redirect to Stripe's hosted page (window.location.href in UpgradeButton),
 *    so neither script-src nor frame-src needs js.stripe.com. The old comment in
 *    this file claiming "a strict policy would break Stripe" no longer holds.
 *  • Inline <script>: three JSON-LD blocks (type="application/ld+json") in
 *    app/layout.tsx, [locale]/page.tsx and [locale]/pricing/page.tsx. JSON-LD is
 *    DATA, not executable code, so CSP does not require 'unsafe-inline' for it.
 *  • Styles: Tailwind compiles to a static stylesheet, but Next injects inline
 *    <style> for critical CSS and libraries set inline style attributes, so
 *    style-src needs 'unsafe-inline'. This is the standard, accepted trade-off
 *    for a Next app and is far less dangerous than the script-src equivalent.
 *  • Fonts: SELF-HOSTED (src/app/fonts/*.woff2, via next/font/local) — the
 *    Google Fonts CDN was removed earlier for reliability, so font-src is
 *    'self' only, no fonts.gstatic.com.
 *  • Images: same-origin, plus data: — the 2FA QR code is rendered client-side
 *    as a data: URI (<img src={qrDataUrl}> in components/security/two-factor.tsx)
 *    and would break without it. There is no remote image host configured.
 *  • XHR/fetch: same-origin API routes, plus Vercel Web Analytics, which beacons
 *    to /_vercel/insights on the SAME origin (no external connect needed).
 *    Anthropic is called ONLY from server routes — a server-side fetch is not
 *    subject to CSP, so api.anthropic.com must NOT be in connect-src.
 *  • Frames: no <iframe> anywhere in src/ → frame-src 'none'.
 *  • Downloads (PDF/JSON export) use blob: URLs on <a download>, which are
 *    navigations, not embedded resources — no directive needed.
 *
 * ── RE-AUDIT (things added AFTER this policy was written) ──
 * Re-checked against the code, not assumed:
 *  • Vercel Web Analytics — SAFE in production. `@vercel/analytics` picks its
 *    script URL in getScriptSrc(): production (and no basePath/scriptSrc prop,
 *    which is how <Analytics /> is used in app/layout.tsx) resolves to the
 *    same-origin "/_vercel/insights/script.js", and the beacon endpoint is left
 *    unset so it defaults to the same origin too. Covered by script-src 'self'
 *    and connect-src 'self'; no external host needed.
 *  • "Segnala un problema" button — POSTs to /api/support/bug-report, same
 *    origin. Covered by connect-src 'self'.
 *  • Insight pagination — same-origin GET /api/ai/insights. Covered.
 *  • Still nothing external: no <iframe>, no <script src>, no remote images
 *    (no images.remotePatterns configured), no <object>/<embed>, no <video>/
 *    <audio>, no eval()/new Function(), no Web Worker. app/manifest.ts is
 *    served same-origin, so manifest-src falls back to default-src 'self'
 *    correctly. The Stripe redirect is window.location.href — a top-level
 *    NAVIGATION, so neither form-action nor frame-src applies to it.
 *
 * ── ⚠️ DEV AND PRODUCTION DO NOT GET THE SAME POLICY ──
 * buildCsp(isDev) returns DIFFERENT policies, so a clean console in the
 * Codespace does NOT prove the production policy is safe:
 *  • dev adds 'unsafe-eval' and ws:/wss: (React Refresh + HMR);
 *  • dev loads analytics from the EXTERNAL https://va.vercel-scripts.com
 *    (script.debug.js — see getScriptSrc's isDevelopment() branch), which the
 *    dev policy does not list, while production loads it same-origin.
 * The only meaningful validation is a deployed environment with the header
 * still in Report-Only. Enable enforcement by setting CSP_ENFORCE=true on
 * Vercel (no code change); remove the variable and redeploy to fall straight
 * back to Report-Only.
 */
const CSP_ENFORCE = process.env.CSP_ENFORCE === 'true';
const CSP_HEADER_NAME = CSP_ENFORCE
  ? 'Content-Security-Policy'
  : 'Content-Security-Policy-Report-Only';

function buildCsp(dev) {
  // Next.js in DEV evaluates code for React Refresh/HMR and opens a websocket,
  // so dev needs 'unsafe-eval' and ws:. Production gets neither.
  const scriptSrc = dev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : // 'unsafe-inline' is still required in production: Next emits small inline
      // bootstrap scripts for hydration and route data. Removing it needs
      // per-request nonces via middleware, which cannot be done from this static
      // headers() config — a deliberate follow-up once report-only is clean.
      "'self' 'unsafe-inline'";

  const connectSrc = dev ? "'self' ws: wss:" : "'self'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSrc}`,
    "frame-src 'none'",
    // Nobody may frame us (belt-and-braces with X-Frame-Options: DENY).
    "frame-ancestors 'none'",
    "base-uri 'self'",
    // No <form action> may post to a third party.
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // react-grid-layout ships CJS-only which causes webpack 5 to hang analyzing
  // the module graph when the package is pulled through dynamic imports.
  // transpilePackages forces webpack to treat them as transpilable sources.
  transpilePackages: ['react-grid-layout', 'react-resizable'],
  // exceljs e' un pacchetto CJS pesante usato SOLO lato server (lettura dei file
  // caricati in /api/data/import/preview). Lasciarlo fuori dal bundle: viene
  // richiesto a runtime da Node, evitando che il bundler debba risolvere i suoi
  // require dinamici.
  serverExternalPackages: ['exceljs'],
  typescript: {
    ignoreBuildErrors: true,
  },
  // L'opzione `eslint` e' stata RIMOSSA in Next 16 (`next lint` non esiste piu'
  // e `next build` non esegue piu' il lint). Il lint gira ora con la CLI ESLint
  // tramite `npm run lint`.
  // Security headers. Level 1 (HSTS/frame/nosniff/referrer/permissions) has been
  // enforced for a while; the CSP below is the new Level 2 and ships in
  // REPORT-ONLY mode first — see the long note above buildCsp().
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // No internal iframe embedding in the repo → DENY is safe.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: CSP_HEADER_NAME, value: buildCsp(isDev) },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
