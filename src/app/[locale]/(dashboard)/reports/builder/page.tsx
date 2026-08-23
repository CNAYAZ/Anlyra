'use client';

export const dynamic = 'force-dynamic';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Save, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/fetcher';
import { FormError } from '@/components/ui/form-error';
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
  /**
   * Form-level error (shown next to Save). Field-attributable errors go in
   * fieldErrors instead, so they appear under the field they are about.
   */
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; recipients?: string }>({});

  const titleRef = useRef<HTMLInputElement>(null);
  const recipientsRef = useRef<HTMLInputElement>(null);

  /**
   * Brings the recipients field into view and focuses it. Worth doing HERE
   * specifically: the field sits in the third card, and the server only
   * rejects a recipient after a round-trip — by then the user has usually
   * scrolled to the button, so an error under a field they cannot see would be
   * no better than the old top-of-page banner.
   */
  const focusRecipients = () => {
    recipientsRef.current?.focus();
    recipientsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<{ id: string }>('/api/reports', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      router.push('/reports');
    },
    onError: (e) => {
      // The API answers with stable codes for the cases it validates itself
      // (see POST /api/reports); two of them carry the offending address(es)
      // after ": ". Anything else — an Unauthorized, a raw Zod validation
      // message, a 500 — falls back to a generic message rather than showing
      // the code/text as-is.
      const raw = (e as Error).message;
      const sep = raw.indexOf(': ');
      const code = sep === -1 ? raw : raw.slice(0, sep);
      const email = sep === -1 ? '' : raw.slice(sep + 2);

      // All three recipient codes are ABOUT the recipients field, so they are
      // shown under it (and the field is focused — it can be off-screen on a
      // long form). Anything else is form-level and shown next to Save.
      if (code === 'RECIPIENTS_REQUIRED') {
        setFieldErrors({ recipients: t('errorRecipientsRequired') });
        focusRecipients();
      } else if (code === 'RECIPIENT_NOT_ORG_MEMBER') {
        setFieldErrors({ recipients: t('errorRecipientNotMember', { email }) });
        focusRecipients();
      } else if (code === 'INVALID_RECIPIENT_FORMAT') {
        setFieldErrors({ recipients: t('errorRecipientInvalidFormat', { email }) });
        focusRecipients();
      } else {
        setError(t('errorSaveGeneric'));
      }
    },
  });

  function toggleSection(key: string) {
    setSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!title.trim()) {
      // Title is the FIRST field of a three-card form: without focusing it the
      // user would be told "title is required" at the bottom of the page while
      // the empty box is out of sight.
      setFieldErrors({ title: t('errorTitleRequired') });
      titleRef.current?.focus();
      titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (sections.length === 0) {
      // Not attributable to a single input (it is a grid of toggles), so it
      // stays form-level, next to the button the user just pressed.
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

      <form onSubmit={submit} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-heading text-lg font-semibold">{t('builderStepInfo')}</h2>
          <div className="space-y-1">
            <Label htmlFor="rep-title">{t('builderTitleField')} *</Label>
            <Input
              id="rep-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('builderTitlePlaceholder')}
              aria-invalid={fieldErrors.title ? true : undefined}
              aria-describedby={fieldErrors.title ? 'rep-title-err' : undefined}
              data-invalid={fieldErrors.title ? 'true' : undefined}
            />
            {fieldErrors.title && (
              <p id="rep-title-err" role="alert" className="flex items-center gap-1.5 text-xs text-danger">
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                {fieldErrors.title}
              </p>
            )}
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
                ref={recipientsRef}
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                aria-invalid={fieldErrors.recipients ? true : undefined}
                aria-describedby={fieldErrors.recipients ? 'rep-recipients-err' : undefined}
                data-invalid={fieldErrors.recipients ? 'true' : undefined}
              />
              {fieldErrors.recipients && (
                <p id="rep-recipients-err" role="alert" className="flex items-center gap-1.5 text-xs text-danger">
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                  {fieldErrors.recipients}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{t('builderRecipientsHint')}</p>
            </div>
          )}
        </div>

        {/* Form-level error sits with the submit button: this form is three
            cards tall, so a banner at the top is off-screen exactly when the
            user clicks Save. */}
        <FormError>{error}</FormError>

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
