'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Save, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/fetcher';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REPORT_SECTIONS, REPORT_SCHEDULES, type ReportSchedule } from '@/lib/report-sections';
import { cn } from '@/lib/utils';

export default function ReportsBuilderPage() {
  const t = useTranslations('reports');
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<string[]>(['kpi_summary', 'revenue_breakdown']);
  const [schedule, setSchedule] = useState<ReportSchedule>('on_demand');
  const [recipients, setRecipients] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<{ id: string }>('/api/reports', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      router.push('/reports');
    },
    onError: (e) => setError((e as Error).message),
  });

  function toggleSection(key: string) {
    setSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError(t('errorTitleRequired'));
      return;
    }
    if (sections.length === 0) {
      setError(t('errorSectionsRequired'));
      return;
    }
    mutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      sections,
      schedule,
      recipients: recipients.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{t('builderTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('builderSubtitle')}</p>
        </div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" /> {t('back')}
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-heading text-lg font-semibold">{t('builderStepInfo')}</h2>
          <div className="space-y-1">
            <Label htmlFor="rep-title">{t('builderTitleField')} *</Label>
            <Input id="rep-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('builderTitlePlaceholder')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rep-desc">{t('builderDescription')}</Label>
            <Input id="rep-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-heading text-lg font-semibold">{t('builderStepSections')}</h2>
          <p className="text-sm text-muted-foreground">{t('builderSectionsHint')}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REPORT_SECTIONS.map((s) => {
              const selected = sections.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleSection(s.key)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    selected
                      ? 'border-primary-accent bg-primary-accent/5'
                      : 'border-border bg-card hover:bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border',
                      selected ? 'border-primary-accent bg-primary-accent text-white' : 'border-border bg-card',
                    )}
                  >
                    {selected && <CheckCircle2 className="h-3 w-3" />}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{t(s.labelKey as 'sectionKpiSummary')}</p>
                    <p className="text-xs text-muted-foreground">{t(s.descKey as 'sectionKpiSummaryDesc')}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-heading text-lg font-semibold">{t('builderStepSchedule')}</h2>
          <div className="space-y-1">
            <Label>{t('builderSchedule')}</Label>
            <Select value={schedule} onValueChange={(v) => setSchedule(v as ReportSchedule)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_SCHEDULES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`schedule${s.charAt(0).toUpperCase()}${s.slice(1).replace(/_(.)/, (_, c: string) => c.toUpperCase())}` as 'scheduleOnDemand')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {schedule !== 'on_demand' && (
            <div className="space-y-1">
              <Label htmlFor="rep-recipients">{t('builderRecipients')}</Label>
              <Input
                id="rep-recipients"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
              />
              <p className="text-xs text-muted-foreground">{t('builderRecipientsHint')}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href="/reports"
            className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {t('cancel')}
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {mutation.isPending ? t('saving') : t('saveReport')}
          </button>
        </div>
      </form>
    </div>
  );
}
