'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetcher';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FormError } from '@/components/ui/form-error';
import { Link } from '@/i18n/routing';
import { useIsDemo } from '@/lib/demo/context';
import { useIsManager } from '@/lib/auth/owner-context';

type Org = {
  id: string;
  name: string;
  slug: string;
  industry: string;
  employees: number;
  country: string;
  currency: string;
};

type OrgAllowance = { allowed: boolean; limit: number; used: number };

export default function SettingsOrganizationPage() {
  const t = useTranslations('settings');
  // Reused as-is rather than duplicated: this is the exact text the creation
  // form itself shows when the server refuses ORG_LIMIT_REACHED, so the
  // explanation the customer reads here and the one they would read after
  // clicking through and submitting are the same words.
  const tOnboarding = useTranslations('onboarding');
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', industry: '', employees: 1, country: 'IT', currency: 'EUR' });
  const [toast, setToast] = useState<'ok' | 'err' | null>(null);
  const initRef = useRef(false);
  // The demo visitor is not a real account: there is no allowance to explain
  // (checkOrganizationAllowance needs a real signed-in userId, which the
  // anonymous demo session never has — GET /api/orgs/allowance would just
  // 401). The card is skipped entirely for the demo rather than shown
  // disabled, same as integrations show "in arrivo" instead of a control
  // that would fail.
  const isDemo = useIsDemo();
  // PATCH /api/settings/organization is requireManagerRole server-side: this
  // form had no role check at all, so an editor or viewer could fill it in
  // and only discover the 403 on submit. Same disable+tooltip precedent as
  // settings/billing's ownerOnly button.
  const isManager = useIsManager();

  const { data, isLoading } = useQuery({
    queryKey: ['settings-org'],
    queryFn: () => apiFetch<Org>('/api/settings/organization'),
  });

  // Account-level, not org-level: whether THIS ACCOUNT may create one more
  // organization, regardless of its role in the org selected above. Same
  // check the creation route enforces (checkOrganizationAllowance), read
  // here only to decide what the button says — never to decide anything.
  const { data: allowance, isLoading: allowanceLoading } = useQuery({
    queryKey: ['orgs-allowance'],
    queryFn: () => apiFetch<OrgAllowance>('/api/orgs/allowance'),
    enabled: !isDemo,
  });

  useEffect(() => {
    if (data && !initRef.current) {
      initRef.current = true;
      setForm({
        name: data.name,
        industry: data.industry,
        employees: data.employees,
        country: data.country,
        currency: data.currency,
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (body: typeof form) =>
      apiFetch<Org>('/api/settings/organization', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      setToast('ok');
      qc.invalidateQueries({ queryKey: ['settings-org'] });
      setTimeout(() => setToast(null), 4000);
    },
    onError: () => {
      setToast('err');
      setTimeout(() => setToast(null), 4000);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('orgTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('orgSubtitle')}</p>
      </div>

      {toast === 'ok' && (
        <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> {t('saved')}
        </div>
      )}

      {isLoading || !data ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
          className="card space-y-4"
        >
          <fieldset disabled={!isManager} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="org-name">{t('orgName')}</Label>
              <Input id="org-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-slug">{t('orgSlug')}</Label>
              <Input id="org-slug" value={data.slug} disabled />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-industry">{t('orgIndustry')}</Label>
              <Input id="org-industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-employees">{t('orgEmployees')}</Label>
              <Input
                id="org-employees"
                type="number"
                min={1}
                value={form.employees}
                onChange={(e) => setForm({ ...form, employees: Number(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-country">{t('orgCountry')}</Label>
              <Input id="org-country" maxLength={2} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-currency">{t('orgCurrency')}</Label>
              <Input id="org-currency" maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            </div>
          </fieldset>

          {/* Failure shown with the button, not in a banner above the form. */}
          <FormError>{toast === 'err' ? t('saveError') : null}</FormError>

          <button
            type="submit"
            disabled={mutation.isPending || !isManager}
            title={!isManager ? t('managerOnlyShort') : undefined}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {mutation.isPending ? t('saving') : t('save')}
          </button>
          {!isManager && <p className="text-[11px] text-muted-foreground">{t('managerOnlyShort')}</p>}
        </form>
      )}

      {/* Entry point to create a SECOND organization — there was previously
          no way to reach it anywhere in the product. Placed here, in the
          existing Organization settings page, rather than in the OrgSwitcher
          dropdown in the topbar: OrgSwitcher hides itself entirely when there
          is only one organization to show (orgs.length < 2), which is
          precisely the case for most people who would want this — someone
          member of a single company, who has created none, still has the
          right to open their own. Putting the entry there would have meant
          also reworking when the switcher shows itself; this page needs no
          such change and is where "manage my company" already lives.
          Visible to every role, not just owner/admin: creating a NEW
          organization is an account-level action, unrelated to what the
          caller may do inside the org they currently have selected. */}
      {!isDemo && (
        <div className="card space-y-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-semibold">{t('orgCreateAnotherTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('orgCreateAnotherSubtitle')}</p>
          </div>

          {allowanceLoading || !allowance ? (
            <Skeleton className="h-10 w-48 rounded-lg" />
          ) : allowance.allowed ? (
            <Link
              href="/onboarding/organization"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {t('orgCreateAnotherCta')}
            </Link>
          ) : (
            <>
              {/* Disabled with an explanation, not hidden — same precedent as
                  settings/billing's ownerOnly button and the Team page's
                  seat-limit invite form: a control that says why it cannot be
                  used beats one the customer only discovers is refused by
                  clicking it. */}
              <button
                type="button"
                disabled
                title={tOnboarding('errors.orgLimitReached', { count: allowance.limit })}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white opacity-60 cursor-not-allowed"
              >
                {t('orgCreateAnotherCta')}
              </button>
              <p className="text-[11px] text-muted-foreground">
                {tOnboarding('errors.orgLimitReached', { count: allowance.limit })}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
