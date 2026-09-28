import { hasControlChars } from '@/lib/validation/display-name';

/**
 * Invoicing data of an organization (founder's decision, 2026-09-27): the
 * owner must enter it before the first payment, because invoices are issued by
 * hand in Fiscozen as Italian electronic invoices, outside the product.
 *
 * Shared by the save route (api/billing/details), the two checkout routes
 * (which refuse to start without complete data) and the billing page, so all
 * three agree on what "complete" means.
 */

/**
 * The ONLY switch for which countries may be invoiced. Today Italy alone:
 * selling to businesses in another EU country needs tax formalities (VIES
 * registration, Intrastat lists) the founder must first check with the
 * accountant. Adding an EU country code here (e.g. 'DE') enables it end to end
 * — the VAT format check for every EU country is already below. A code that is
 * not an EU member state is never accepted, whatever this list says.
 */
export const ACCEPTED_BILLING_COUNTRIES: readonly string[] = ['IT'];

/** EU member states → the prefix their VAT numbers carry (Greece uses "EL", as in VIES). */
export const EU_VAT_PREFIX: Readonly<Record<string, string>> = {
  AT: 'AT', BE: 'BE', BG: 'BG', CY: 'CY', CZ: 'CZ', DE: 'DE', DK: 'DK', EE: 'EE',
  ES: 'ES', FI: 'FI', FR: 'FR', GR: 'EL', HR: 'HR', HU: 'HU', IE: 'IE', IT: 'IT',
  LT: 'LT', LU: 'LU', LV: 'LV', MT: 'MT', NL: 'NL', PL: 'PL', PT: 'PT', RO: 'RO',
  SE: 'SE', SI: 'SI', SK: 'SK',
};

export type BillingField =
  | 'legalName'
  | 'vatNumber'
  | 'address'
  | 'postalCode'
  | 'city'
  | 'province'
  | 'country'
  | 'sdiCode'
  | 'pec';

/** Stable codes; the interface turns each into a sentence (it.json / en.json). */
export type BillingFieldError =
  | 'REQUIRED'
  | 'TOO_LONG'
  | 'INVALID_CHARACTERS'
  | 'COUNTRY_INVALID'
  | 'COUNTRY_NOT_ACCEPTED'
  | 'VAT_INVALID'
  | 'VAT_PREFIX_MISMATCH'
  | 'POSTAL_CODE_INVALID'
  | 'PROVINCE_INVALID'
  | 'SDI_INVALID'
  | 'PEC_INVALID'
  | 'SDI_OR_PEC_REQUIRED';

export type BillingDetailsInput = Partial<Record<BillingField, string | null | undefined>>;

/** What is stored, field by field (Organization.billing* and vatNumber). */
export type BillingDetails = {
  legalName: string;
  vatNumber: string;
  address: string;
  postalCode: string;
  city: string;
  province: string | null;
  country: string;
  sdiCode: string | null;
  pec: string | null;
};

type Result =
  | { ok: true; data: BillingDetails }
  | { ok: false; errors: Partial<Record<BillingField, BillingFieldError>> };

const MAX: Record<BillingField, number> = {
  legalName: 200,
  vatNumber: 20,
  address: 200,
  postalCode: 12,
  city: 100,
  province: 2,
  country: 2,
  sdiCode: 7,
  pec: 254,
};

/**
 * Italian VAT number (partita IVA): 11 digits, the last one a check digit.
 * Digits in odd positions (1st, 3rd, … 9th) are added as they are; digits in
 * even positions (2nd, … 10th) are doubled, minus 9 when the result exceeds 9.
 * The check digit is (10 − total mod 10) mod 10.
 */
export function isValidItalianVat(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false;
  // The first 7 digits are the registration number, never all zeros —
  // "00000000000" passes the check digit but is not a real VAT number.
  if (digits.startsWith('0000000')) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const d = digits.charCodeAt(i) - 48;
    if (i % 2 === 0) sum += d;
    else sum += d * 2 > 9 ? d * 2 - 9 : d * 2;
  }
  return (10 - (sum % 10)) % 10 === digits.charCodeAt(10) - 48;
}

/**
 * Checks every field and returns the normalized data to store, or one error
 * code per wrong field. Italy: 11-digit VAT with check digit ("IT" prefix
 * optional, stored without it), 5-digit postal code, province, and an SDI code
 * OR a PEC address. Another EU country (only if listed in
 * ACCEPTED_BILLING_COUNTRIES): VAT with that country's prefix (format only —
 * each country has its own check-digit rules and the real check, VIES, would
 * need a network call), stored with the prefix; no province, SDI or PEC
 * required.
 */
export function validateBillingDetails(input: BillingDetailsInput): Result {
  const errors: Partial<Record<BillingField, BillingFieldError>> = {};
  const raw = (f: BillingField) => (typeof input[f] === 'string' ? (input[f] as string).trim() : '');

  for (const f of Object.keys(MAX) as BillingField[]) {
    const v = raw(f);
    if (v.length > MAX[f] && f !== 'vatNumber') errors[f] = 'TOO_LONG';
    else if (v && hasControlChars(v)) errors[f] = 'INVALID_CHARACTERS';
  }

  const country = raw('country').toUpperCase();
  const vatPrefix = EU_VAT_PREFIX[country];
  if (!country) errors.country = 'REQUIRED';
  else if (!/^[A-Z]{2}$/.test(country)) errors.country = 'COUNTRY_INVALID';
  else if (!vatPrefix || !ACCEPTED_BILLING_COUNTRIES.includes(country)) errors.country = 'COUNTRY_NOT_ACCEPTED';

  for (const f of ['legalName', 'vatNumber', 'address', 'postalCode', 'city'] as const) {
    if (!raw(f) && !errors[f]) errors[f] = 'REQUIRED';
  }

  const isItaly = country === 'IT';
  let vatNumber = raw('vatNumber').toUpperCase().replace(/[\s.\-]/g, '');
  if (vatNumber && !errors.vatNumber) {
    if (isItaly) {
      if (vatNumber.startsWith('IT')) vatNumber = vatNumber.slice(2);
      if (!isValidItalianVat(vatNumber)) errors.vatNumber = 'VAT_INVALID';
    } else if (vatPrefix) {
      if (!vatNumber.startsWith(vatPrefix)) errors.vatNumber = 'VAT_PREFIX_MISMATCH';
      else if (!/^[A-Z0-9]{2,12}$/.test(vatNumber.slice(vatPrefix.length))) errors.vatNumber = 'VAT_INVALID';
    }
  }

  const postalCode = raw('postalCode').toUpperCase();
  if (postalCode && !errors.postalCode) {
    const ok = isItaly ? /^\d{5}$/.test(postalCode) : /^[A-Z0-9][A-Z0-9 \-]{1,10}$/.test(postalCode);
    if (!ok) errors.postalCode = 'POSTAL_CODE_INVALID';
  }

  const province = raw('province').toUpperCase();
  const sdiCode = raw('sdiCode').toUpperCase();
  const pec = raw('pec').toLowerCase();
  if (pec && !errors.pec && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pec)) errors.pec = 'PEC_INVALID';
  if (isItaly) {
    if (!province) errors.province = 'REQUIRED';
    else if (!errors.province && !/^[A-Z]{2}$/.test(province)) errors.province = 'PROVINCE_INVALID';
    // "0000000" is the official code for "no channel of my own": the invoice
    // is delivered to the recipient's fiscal drawer (cassetto fiscale).
    if (sdiCode && !errors.sdiCode && !/^[A-Z0-9]{7}$/.test(sdiCode)) errors.sdiCode = 'SDI_INVALID';
    if (!sdiCode && !pec) errors.sdiCode = 'SDI_OR_PEC_REQUIRED';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      legalName: raw('legalName'),
      vatNumber,
      address: raw('address'),
      postalCode,
      city: raw('city'),
      province: isItaly ? province : null,
      country,
      sdiCode: isItaly && sdiCode ? sdiCode : null,
      pec: pec || null,
    },
  };
}

/** The Organization columns this module reads and writes. */
export const BILLING_SELECT = {
  billingLegalName: true,
  vatNumber: true,
  billingAddress: true,
  billingPostalCode: true,
  billingCity: true,
  billingProvince: true,
  billingCountry: true,
  billingSdiCode: true,
  billingPec: true,
} as const;

type BillingColumns = {
  billingLegalName: string | null;
  vatNumber: string | null;
  billingAddress: string | null;
  billingPostalCode: string | null;
  billingCity: string | null;
  billingProvince: string | null;
  billingCountry: string | null;
  billingSdiCode: string | null;
  billingPec: string | null;
};

/** Stored columns → the form's field names. */
export function billingInputFromOrganization(org: BillingColumns): BillingDetailsInput {
  return {
    legalName: org.billingLegalName,
    vatNumber: org.vatNumber,
    address: org.billingAddress,
    postalCode: org.billingPostalCode,
    city: org.billingCity,
    province: org.billingProvince,
    country: org.billingCountry,
    sdiCode: org.billingSdiCode,
    pec: org.billingPec,
  };
}

/** Validated data → the Organization columns to write. */
export function organizationColumnsFromBilling(d: BillingDetails): BillingColumns {
  return {
    billingLegalName: d.legalName,
    vatNumber: d.vatNumber,
    billingAddress: d.address,
    billingPostalCode: d.postalCode,
    billingCity: d.city,
    billingProvince: d.province,
    billingCountry: d.country,
    billingSdiCode: d.sdiCode,
    billingPec: d.pec,
  };
}

/**
 * Whether the stored data is complete and valid NOW — re-validated on every
 * call, never trusted from save time: a country removed from
 * ACCEPTED_BILLING_COUNTRIES, or a VAT number typed freely at onboarding,
 * makes it incomplete again.
 */
export function checkStoredBillingDetails(org: BillingColumns) {
  return validateBillingDetails(billingInputFromOrganization(org));
}

/** The VAT number as Stripe's "eu_vat" tax id wants it: always with the country prefix. */
export function stripeVatValue(d: BillingDetails): string {
  const prefix = EU_VAT_PREFIX[d.country] ?? d.country;
  return d.vatNumber.startsWith(prefix) ? d.vatNumber : `${prefix}${d.vatNumber}`;
}
