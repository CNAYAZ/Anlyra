// Re-exports the SAME navigation helpers as './routing' — do not build a
// second `createNavigation()` here. A duplicate call with its own config
// (this file used to pass `localePrefix: 'as-needed'`) drifts from the
// middleware's routing config (`localePrefix: 'always'`, see ./routing.ts
// and middleware.ts) and produces links missing the locale prefix the
// middleware requires — e.g. Link href="/legal/privacy" instead of
// "/it/legal/privacy", which the middleware then fails to resolve. That
// mismatch was the root cause of the footer's broken Privacy Policy link.
export { Link, redirect, usePathname, useRouter, getPathname } from './routing';
