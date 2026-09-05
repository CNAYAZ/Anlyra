/**
 * Escapes text for safe interpolation into HTML markup: the five characters
 * that can break out of element content or an attribute value.
 *
 * Promoted from bug-report.ts, the only template in this folder that already
 * had this (verified correct: covers & < > " ', with & replaced FIRST so the
 * entities this function just inserted are never re-escaped on a later
 * `.replace` in the chain) — now shared by every template instead of each one
 * trusting its caller on its own.
 *
 * Applies to plain TEXT interpolated into HTML. It does NOT make a value safe
 * inside a `mailto:`/`href` URL by itself — see escapeMailtoAddress below for
 * why that needs different handling.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Makes a value safe to sit inside a `mailto:` href — a DIFFERENT problem from
 * HTML-escaping, and one HTML-escaping does not solve.
 *
 * escapeHtml stops a value from breaking out of the attribute/tag it sits in
 * while the HTML is being PARSED. It does nothing to stop the value from
 * carrying mailto's OWN structural characters (`?`, `&`, `=`) into the URL a
 * mail client actually opens once those HTML entities are decoded back out —
 * `&amp;` in the markup still decodes to a literal `&` in the resolved href,
 * so an escaped-for-HTML value can still inject extra mailto parameters like
 * `&bcc=someone@else.com` or `&subject=...`.
 *
 * This is reachable today: the email-format checks this app uses when an
 * address is first accepted (registration: `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`;
 * an invite recipient: `/\S+@\S+\.\S+/`) forbid stray `@` and whitespace but
 * say nothing about `?`, `&`, `=`, `<`, `"` — an address built from those
 * still passes.
 *
 * encodeURIComponent neutralises all of that (it can only ever produce
 * letters, digits, a fixed safe punctuation set, and %XX sequences), and its
 * output needs no HTML-escaping on top — none of those characters have any
 * special meaning in HTML either.
 */
export function escapeMailtoAddress(value: string): string {
  return encodeURIComponent(value);
}
