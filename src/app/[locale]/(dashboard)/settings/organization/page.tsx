'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, X } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetcher';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

type Org = {
  id: string;
  name: string;
  slug: string;
  industry: string;
  employees: number;
  country: string;
  currency: string;
};

export default function SettingsOrganizationPage() {
  const t = useTranslations('settings');
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', industry: '', employees: 1, country: 'IT', currency: 'EUR' });
  const [toast, setToast] = useState<'ok' | 'err' | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['settings-org'],
    queryFn: () => apiFetch<Org>('/api/settings/organization'),
  });

  useEffect(() => {
    if (data) {
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
      {toast === 'err' && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          <X className="h-4 w-4" /> {t('saveError')}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {mutation.isPending ? t('saving') : t('save')}
          </button>
        </form>
      )}
    </div>
  );
}
