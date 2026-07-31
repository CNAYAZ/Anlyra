import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

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
  // Security headers (Level 1 — low risk, no CSP yet). CSP is intentionally
  // omitted here: a strict policy would break Stripe/inline scripts and will be
  // introduced later in report-only mode first.
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
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
