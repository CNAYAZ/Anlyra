'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetcher';
import {
  EU_VAT_PREFIX,
  type BillingDetailsInput,
  type BillingField,
  type BillingFieldError,
} from '@/lib/billing/billing-details';
import { COMPANY } from '@/lib/company';
import { useAppLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

export type BillingDetailsResponse = {
  details: BillingDetailsInput;
  complete: boolean;
  canEdit: boolean;
  acceptedCountries: string[];
};

const QUERY_KEY = ['billing-details'] as const;

/** Shared with the billing page, which keeps the payment buttons disabled until `complete`. */
export function useBillingDetails() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => apiFetch<BillingDetailsResponse>('/api/billing/details'),
  });
}

/** Value of the country menu for a company outside the EU. */
const OTHER_COUNTRY = 'OTHER';

const FIELDS: BillingField[] = [
  'legalName', 'vatNumber', 'address', 'postalCode', 'city', 'province', 'country', 'sdiCode', 'pec',
];

type FormState = Record<BillingField, string>;

function toForm(d: BillingDetailsInput): FormState {
  const form = {} as FormState;
  for (const f of FIELDS) form[f] = d[f] ?? '';
  if (!form.country) form.country = 'IT';
  else if (!EU_VAT_PREFIX[form.country]) form.country = OTHER_COUNTRY;
  return form;
}

/**
 * "Dati di fatturazione": what the founder needs to issue the electronic
 * invoice. Every member sees it; only the owner can change it (the save route
 * refuses anyone else — see api/billing/details).
 */
/**
 * `hideHeading`: on its own page the page title already says "Dati di
 * fatturazione"; the card then keeps only the status badge.
 */
export function BillingDetailsForm({ hideHeading = false }: { hideHeading?: boolean } = {}) {
  const tBilling = useTranslations('billing');
  const locale = useAppLocale();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useBillingDetails();

  const [form, setForm] = useState<FormState>(() => toForm({}));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<BillingField, BillingFieldError>>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'saved' | 'invalid' | 'error' | null>(null);

  useEffect(() => {
    if (data) setForm(toForm(data.details));
  }, [data]);

  const countryNames = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: 'region' });
    return Object.keys(EU_VAT_PREFIX)
      .map((code) => ({ code, name: names.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);

  const canEdit = data?.canEdit === true;
  const isItaly = form.country === 'IT';
  const countryAccepted = !!data && form.country !== OTHER_COUNTRY && data.acceptedCountries.includes(form.country);

  function set(field: BillingField, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    // A new country changes the rules for every other field: old errors no longer apply.
    setFieldErrors((e) => (field === 'country' ? {} : { ...e, [field]: undefined }));
    setStatus(null);
  }

  function errorText(code: BillingFieldError | undefined) {
    if (!code) return null;
    if (code === 'COUNTRY_NOT_ACCEPTED') return tBilling('details.countryNotAccepted', { email: COMPANY.contactEmail });
    return tBilling(`details.errors.${code}` as 'details.errors.REQUIRED');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !canEdit || !countryAccepted) return;
    setSaving(true);
    setStatus(null);
    setFieldErrors({});
    try {
      const res = await fetch('/api/billing/details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // Province, SDI code and PEC only mean something for an Italian company.
        body: JSON.stringify({
          ...form,
          province: isItaly ? form.province : '',
          sdiCode: isItaly ? form.sdiCode : '',
          pec: isItaly ? form.pec : '',
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { details: BillingDetailsInput; complete: boolean };
        error?: string;
        fields?: Partial<Record<BillingField, BillingFieldError>>;
      };
      if (json.success && json.data) {
        queryClient.setQueryData<BillingDetailsResponse>(QUERY_KEY, {
          ...data,
          details: json.data.details,
          complete: json.data.complete,
        });
        setStatus('saved');
      } else if (json.error === 'BILLING_DETAILS_INVALID' && json.fields) {
        setFieldErrors(json.fields);
        setStatus('invalid');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-70';

  function input(field: BillingField, extra?: { maxLength?: number; placeholder?: string; uppercase?: boolean }) {
    const err = errorText(fieldErrors[field]);
    return (
      <label className="block space-y-1">
        <span className="text-xs font-medium text-fg-2">{tBilling(`details.fields.${field}` as 'details.fields.legalName')}</span>
        <input
          type={field === 'pec' ? 'email' : 'text'}
          value={form[field]}
          onChange={(e) => set(field, e.target.value)}
          disabled={!canEdit || saving}
          maxLength={extra?.maxLength}
          placeholder={extra?.placeholder}
          aria-invalid={!!err}
          className={cn(inputClass, extra?.uppercase && 'uppercase', err && 'border-danger')}
        />
        {err && <span className="block text-[11px] text-danger">{err}</span>}
      </label>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-elev-1">
      <div className="flex flex-wrap items-start gap-3 mb-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-sage-50 text-sage-600 dark:bg-sage-700/30 dark:text-sage-300 shrink-0">
          <FileText className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-[200px]">
          {!hideHeading && (
            <>
              <h2 className="font-heading text-lg font-semibold text-foreground">{tBilling('details.title')}</h2>
              <p className="text-xs text-fg-3">{tBilling('details.subtitle')}</p>
            </>
          )}
        </div>
        {data && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0',
              data.complete
                ? 'bg-success-50 text-success-700 dark:bg-success-500/10'
                : 'bg-muted text-fg-2',
            )}
          >
            {data.complete ? tBilling('details.statusComplete') : tBilling('details.statusIncomplete')}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-fg-3">…</p>
      ) : isError || !data ? (
        <p className="text-sm text-danger">{tBilling('details.loadError')}</p>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">{input('legalName', { maxLength: 200 })}</div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-fg-2">{tBilling('details.fields.country')}</span>
              <select
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                disabled={!canEdit || saving}
                className={cn(inputClass, fieldErrors.country && 'border-danger')}
              >
                {countryNames.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
                <option value={OTHER_COUNTRY}>{tBilling('details.otherCountry')}</option>
              </select>
              {fieldErrors.country && fieldErrors.country !== 'COUNTRY_NOT_ACCEPTED' && (
                <span className="block text-[11px] text-danger">{errorText(fieldErrors.country)}</span>
              )}
            </label>
            {input('vatNumber', { maxLength: 20, uppercase: true, placeholder: isItaly ? '12345678901' : undefined })}
            <div className="sm:col-span-2">{input('address', { maxLength: 200 })}</div>
            {input('postalCode', { maxLength: 12 })}
            {input('city', { maxLength: 100 })}
            {isItaly && input('province', { maxLength: 2, uppercase: true, placeholder: 'MO' })}
          </div>

          {!countryAccepted && (
            <p role="status" className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground">
              {tBilling('details.countryNotAccepted', { email: COMPANY.contactEmail })}
            </p>
          )}

          {isItaly && (
            <div className="space-y-2">
              <p className="text-xs text-fg-3">{tBilling('details.sdiOrPecHint')}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {input('sdiCode', { maxLength: 7, uppercase: true, placeholder: '0000000' })}
                {input('pec', { maxLength: 254 })}
              </div>
            </div>
          )}

          {canEdit ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving || !countryAccepted}
                className="rounded-lg bg-sage-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-600 disabled:opacity-70"
              >
                {saving ? tBilling('details.saving') : tBilling('details.save')}
              </button>
              {status === 'saved' && <span role="status" className="text-xs text-success-700">{tBilling('details.saved')}</span>}
              {status === 'invalid' && <span role="status" className="text-xs text-danger">{tBilling('details.invalid')}</span>}
              {status === 'error' && <span role="status" className="text-xs text-danger">{tBilling('details.saveError')}</span>}
            </div>
          ) : (
            <p className="text-[11px] text-fg-3">{tBilling('details.ownerOnlyEdit')}</p>
          )}
        </form>
      )}
    </div>
  );
}
