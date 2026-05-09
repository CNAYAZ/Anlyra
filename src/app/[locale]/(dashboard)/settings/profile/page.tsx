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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Profile = { id: string; name: string | null; email: string; locale: string };

export default function SettingsProfilePage() {
  const t = useTranslations('settings');
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [locale, setLocale] = useState<'it' | 'en'>('it');
  const [toast, setToast] = useState<'ok' | 'err' | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => apiFetch<Profile>('/api/settings/profile'),
  });

  useEffect(() => {
    if (data) {
      setName(data.name ?? '');
      setLocale(data.locale === 'en' ? 'en' : 'it');
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (body: { name: string; locale: 'it' | 'en' }) =>
      apiFetch<Profile>('/api/settings/profile', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      setToast('ok');
      qc.invalidateQueries({ queryKey: ['settings-profile'] });
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
        <h1 className="font-heading text-2xl font-semibold">{t('profileTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('profileSubtitle')}</p>
      </div>

      {toast === 'ok' && (
        <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {t('saved')}
        </div>
      )}
      {toast === 'err' && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          <X className="h-4 w-4" />
          {t('saveError')}
        </div>
      )}

      {isLoading || !data ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({ name, locale });
          }}
          className="card space-y-4"
        >
          <div className="space-y-1">
            <Label htmlFor="name">{t('fieldName')}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">{t('fieldEmail')}</Label>
            <Input id="email" value={data.email} disabled />
            <p className="text-xs text-muted-foreground">{t('emailReadOnly')}</p>
          </div>
          <div className="space-y-1">
            <Label>{t('fieldLocale')}</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as 'it' | 'en')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="it">Italiano</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
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
