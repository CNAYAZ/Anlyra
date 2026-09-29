import DISPOSABLE_DOMAINS from './disposable-email-domains.json';

/**
 * Temporary ("disposable") email addresses are refused at sign-up: an account
 * must use an address that will still work when the trial ends, the first
 * invoice is sent and the renewal reminders arrive.
 *
 * The list comes from github.com/disposable-email-domains/disposable-email-domains
 * (public domain, CC0) and is copied into disposable-email-domains.json.
 * Refresh it by hand with `npm run update:disposable-domains`.
 */

/**
 * False positives: domains on the upstream list that a real customer uses.
 * The ONLY place to allow one — add it here, lowercase, with a note on who
 * asked and when. Checked before the list, so it wins over it.
 */
export const DISPOSABLE_EMAIL_EXCEPTIONS: ReadonlySet<string> = new Set<string>([]);

const BLOCKED: ReadonlySet<string> = new Set(DISPOSABLE_DOMAINS as string[]);

/**
 * True when the address belongs to a temporary email service. Subdomains
 * count too ("x.mailinator.com" is mailinator). Looks at the domain only:
 * the answer never depends on whether the address is already registered.
 */
export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const labels = email.slice(at + 1).trim().toLowerCase().replace(/\.$/, '').split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    const domain = labels.slice(i).join('.');
    if (DISPOSABLE_EMAIL_EXCEPTIONS.has(domain)) return false;
    if (BLOCKED.has(domain)) return true;
  }
  return false;
}
