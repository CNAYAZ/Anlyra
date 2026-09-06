'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Calendar, Clock, Mail, Pencil, Plus } from 'lucide-react';
import { useAppLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/utils';
import { apiFetch } from '@/lib/api/fetcher';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsManager } from '@/lib/auth/owner-context';
import { ReportEditDialog, type ReportEditValues } from '@/components/reports/report-edit-dialog';

type Report = {
  id: string;
  title: string;
  description: string | null;
  schedule: string | null;
  recipients: string | null;
  lastRunAt: string | null;
  createdAt: string;
};

/**
 * Recipient ADDRESSES, not just a count — the count alone (the previous
 * behaviour here) meant a customer could see "3 destinatari" but never who
 * they actually were, even though the API already sends the real addresses.
 * Shows the first two inline, "+N" for the rest (same truncation idea as the
 * section badges in reports/page.tsx), with the full list as a title tooltip
 * so nothing is ever fully hidden.
 */
function RecipientsSummary({ recipients, moreLabel }: { recipients: string; moreLabel: (count: number) => string }) {
  const addresses = recipients.split(',').map((s) => s.trim()).filter(Boolean);
  if (addresses.length === 0) return null;
  const shown = addresses.slice(0, 2);
  const rest = addresses.length - shown.length;
  return (
    <span className="inline-flex items-center gap-1" title={addresses.join(', ')}>
      <Mail className="h-3 w-3" />
      {shown.join(', ')}
      {rest > 0 && ` ${moreLabel(rest)}`}
    </span>
  );
}

export default function ReportsScheduledPage() {
  const t = useTranslations('reports');
  const locale = useAppLocale();
  const qc = useQueryClient();
  const isManager = useIsManager();

  const [editing, setEditing] = useState<Report | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ recipients?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Same toast pattern as spese-ricorrenti/page.tsx (state + timeout, no new
  // component) — confirms a save actually happened, since the dialog itself
  // just closes on success.
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'scheduled'],
    queryFn: () => apiFetch<{ reports: Report[] }>('/api/reports?scheduled=1'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ReportEditValues }) =>
      apiFetch<{ id: string }>(`/api/reports/${id}`, { method: 'PATCH', body: JSON.stringify(values) }),
    onSuccess: () => {
      setFieldErrors({});
      setFormError(null);
      setDialogOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['reports', 'scheduled'] });
      toast(t('editSuccess'));
    },
    // Same error codes POST /api/reports already answers with, mapped the same
    // way reports/builder/page.tsx maps them — see that file's onError for why.
    onError: (e) => {
      const raw = (e as Error).message;
      const sep = raw.indexOf(': ');
      const code = sep === -1 ? raw : raw.slice(0, sep);
      const email = sep === -1 ? '' : raw.slice(sep + 2);
      if (code === 'RECIPIENTS_REQUIRED') {
        setFieldErrors({ recipients: t('errorRecipientsRequired') });
      } else if (code === 'RECIPIENT_NOT_ORG_MEMBER') {
        setFieldErrors({ recipients: t('errorRecipientNotMember', { email }) });
      } else if (code === 'INVALID_RECIPIENT_FORMAT') {
        setFieldErrors({ recipients: t('errorRecipientInvalidFormat', { email }) });
      } else {
        setFormError(t('errorSaveGeneric'));
      }
    },
  });

  function openEdit(r: Report) {
    setFieldErrors({});
    setFormError(null);
    setEditing(r);
    setDialogOpen(true);
  }

  function handleEditSubmit(values: ReportEditValues) {
    if (!editing) return;
    setFieldErrors({});
    setFormError(null);
    updateMutation.mutate({ id: editing.id, values });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{t('scheduledTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('scheduledSubtitle')}</p>
          {/* Shown once for the whole page rather than repeated on every row's
              disabled edit button — same information, said once. */}
          {!isManager && <p className="text-xs text-muted-foreground">{t('editManagerOnly')}</p>}
        </div>
        <Link
          href="/reports/builder"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> {t('newReport')}
        </Link>
      </div>

      {toastMsg && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-3 text-sm text-foreground">
          {toastMsg}
        </div>
      )}

      {isLoading || !data ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : data.reports.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
          <Calendar className="h-8 w-8 opacity-40" />
          <p>{t('scheduledEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.reports.map((r) => (
            <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[200px]">
                <h3 className="font-medium">{r.title}</h3>
                {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary-accent/30 bg-primary-accent/10 px-2 py-1 font-medium text-primary-accent">
                  <Calendar className="h-3 w-3" />
                  {r.schedule && t(`schedule${r.schedule.charAt(0).toUpperCase()}${r.schedule.slice(1)}` as 'scheduleWeekly')}
                </span>
                {r.recipients && (
                  <RecipientsSummary
                    recipients={r.recipients}
                    moreLabel={(count) => t('scheduledRecipientsMore', { count })}
                  />
                )}
                {r.lastRunAt && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t('lastRun')} {formatDate(r.lastRunAt, locale)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  disabled={!isManager}
                  title={!isManager ? t('editManagerOnly') : t('editButton')}
                  aria-label={t('editButton')}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReportEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleEditSubmit}
        pending={updateMutation.isPending}
        report={editing}
        fieldErrors={fieldErrors}
        formError={formError}
      />
    </div>
  );
}
