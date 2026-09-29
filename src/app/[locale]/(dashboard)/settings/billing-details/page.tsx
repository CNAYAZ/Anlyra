'use client';

export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import { BillingDetailsForm } from '@/components/billing/BillingDetailsForm';

/**
 * Settings → Dati di fatturazione: the invoicing data form, on its own page
 * (founder's decision). Everyone sees it; only the owner can change it — the
 * form and the save route (api/billing/details) enforce that, not this page.
 */
export default function SettingsBillingDetailsPage() {
  const tBilling = useTranslations('billing');
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">{tBilling('details.title')}</h1>
        <p className="text-sm text-fg-2 mt-0.5">{tBilling('details.subtitle')}</p>
      </div>
      <BillingDetailsForm hideHeading />
    </div>
  );
}
