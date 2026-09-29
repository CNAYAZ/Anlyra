'use client';

import { useTranslations } from 'next-intl';
import type { BillingDetailsInput, BillingField, BillingFieldError } from '@/lib/billing/billing-details';
import { cn } from '@/lib/utils';

export type BillingFieldErrors = Partial<Record<BillingField, BillingFieldError>>;

/** Only Italy is accepted today (ACCEPTED_BILLING_COUNTRIES), so the country is fixed. */
export const EMPTY_ONBOARDING_BILLING: BillingDetailsInput = {
  legalName: '', vatNumber: '', address: '', postalCode: '', city: '', province: '', country: 'IT', sdiCode: '', pec: '',
};

/**
 * The invoicing fields asked when a company is created (api/onboarding/organization).
 * BillingDetailsForm cannot be used there: it loads and saves the data of an
 * organization that already exists. Same labels, same error texts and — on
 * both sides — the same validator (validateBillingDetails), so the two can
 * never disagree on what "complete" means.
 */
export function BillingFields({
  value,
  onChange,
  errors,
  disabled,
}: {
  value: BillingDetailsInput;
  onChange: (next: BillingDetailsInput) => void;
  errors: BillingFieldErrors;
  disabled?: boolean;
}) {
  const t = useTranslations('billing.details');

  function input(field: BillingField, extra?: { maxLength?: number; placeholder?: string; uppercase?: boolean; wide?: boolean }) {
    const code = errors[field];
    return (
      <label className={cn('block space-y-1', extra?.wide && 'sm:col-span-2')}>
        <span className="text-xs font-medium text-fg-2">{t(`fields.${field}` as 'fields.legalName')}</span>
        <input
          type={field === 'pec' ? 'email' : 'text'}
          value={value[field] ?? ''}
          onChange={(e) => onChange({ ...value, [field]: e.target.value })}
          disabled={disabled}
          maxLength={extra?.maxLength}
          placeholder={extra?.placeholder}
          aria-invalid={!!code}
          className={cn(
            'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-70',
            extra?.uppercase && 'uppercase',
            code && 'border-danger',
          )}
        />
        {code && <span className="block text-[11px] text-danger">{t(`errors.${code}` as 'errors.REQUIRED')}</span>}
      </label>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">{t('title')}</p>
        <p className="text-xs text-muted-foreground">{t('onboardingIntro')}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {input('legalName', { maxLength: 200, wide: true })}
        {input('vatNumber', { maxLength: 20, uppercase: true, placeholder: '12345678901' })}
        {input('address', { maxLength: 200 })}
        {input('postalCode', { maxLength: 12 })}
        {input('city', { maxLength: 100 })}
        {input('province', { maxLength: 2, uppercase: true, placeholder: 'MO' })}
      </div>
      <p className="text-xs text-muted-foreground">{t('sdiOrPecHint')}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {input('sdiCode', { maxLength: 7, uppercase: true, placeholder: '0000000' })}
        {input('pec', { maxLength: 254 })}
      </div>
    </div>
  );
}
