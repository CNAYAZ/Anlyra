/**
 * Single source of truth for Anlyra's own company data.
 *
 * WHY IT EXISTS: `contact@anlyra.com` alone appeared as a literal string in 38
 * places across the repo (10 in code, 2 in comments, 26 inside the i18n files).
 * The legal name, address, VAT number and PEC were similarly scattered. The day
 * any of them changes, one gets forgotten — and the one that gets forgotten is
 * silently wrong on a legal page or in an email a customer receives.
 *
 * WHERE IT LIVES: `src/lib/company.ts`, flat next to the other small
 * cross-cutting constant modules (`timezone.ts`, `format.ts`, `plans.ts`). It is
 * imported by server code (email templates, API routes, JSON-LD) AND by client
 * components (landing, pricing), so it must stay free of any server-only import
 * — it deliberately contains nothing but plain data and two pure helpers.
 *
 * ── THE i18n FILES ARE NOT COVERED BY THIS, ON PURPOSE ──
 * `src/messages/it.json` / `en.json` cannot import a TypeScript constant, and
 * 26 of the 38 occurrences live there — inside legal PROSE ("Anlyra è un
 * servizio SaaS gestito da Lena di Ipek Mikail, ... P.IVA 04275010363. ...").
 * Those were deliberately NOT converted into ICU placeholders:
 *   • legal text is written and reviewed as prose by a human; a sentence broken
 *     into `{companyLegalName}` / `{companyVat}` fragments is harder to read and
 *     to have reviewed;
 *   • next-intl THROWS at render time on a missing ICU argument, so every legal
 *     page would gain a new way to crash in production, in exchange for values
 *     (VAT, registered address, legal name) that essentially never change;
 *   • the i18n files already expose the structured keys the footer and the legal
 *     header read (`legal.contactEmail`, `legal.companyLegalName`,
 *     `legal.companyAddress`, `legal.companyVat`), so there is already one
 *     canonical place per value INSIDE i18n.
 * Instead, drift between this file and the i18n files is caught by
 * `npm run check:company` (`scripts/check-company-data.ts`), which fails when
 * they disagree. That is the safety net for the half this constant cannot reach.
 */

export const COMPANY = {
  /** Public contact address. The one value here that plausibly changes. */
  contactEmail: 'contact@anlyra.com',
  /** Envelope sender for transactional email. Overridable via RESEND_FROM. */
  noreplyEmail: 'noreply@anlyra.com',
  /** Registered business name (ditta individuale). */
  legalName: 'Lena di Ipek Mikail',
  /** Registered address, single line, as printed on legal pages and emails. */
  address: 'Piazza Gramsci 8, 41030 San Prospero (MO), Italia',
  /** Italian VAT number, digits only — format it at the call site. */
  vat: '04275010363',
  /** Certified email (PEC). Legally binding channel in Italy. */
  pec: 'mikail.ipek@pec.fiscozen.it',
  /** Comune + province, for structured data that wants them apart from the street. */
  city: 'San Prospero',
  province: 'MO',
  region: 'Emilia-Romagna',
  postalCode: '41030',
  countryCode: 'IT',
} as const;

/**
 * `mailto:` URL for the contact address, with the subject percent-encoded.
 *
 * Centralised because the three call sites previously hand-wrote their own
 * encoding (`?subject=Enterprise%20Inquiry%20%E2%80%94%20Anlyra`), which is
 * easy to get subtly wrong and impossible to grep for. Pass the subject as
 * plain readable text; this handles the escaping.
 */
export function contactMailto(subject?: string): string {
  const base = `mailto:${COMPANY.contactEmail}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}

/** "Lena di Ipek Mikail · Piazza Gramsci 8, 41030 San Prospero (MO), Italia" */
export function companyFooterLine(): string {
  return `${COMPANY.legalName} · ${COMPANY.address}`;
}
