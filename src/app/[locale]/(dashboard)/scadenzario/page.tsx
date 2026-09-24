'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Send, CheckCircle2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { ReceivableFormDialog, type ReceivableFormValues } from '@/components/receivables/receivable-form-dialog';
import { ReminderDialog } from '@/components/receivables/reminder-dialog';
import { apiFetch } from '@/lib/api/fetcher';
import { useIsReadOnlyRole, useIsManager } from '@/lib/auth/owner-context';
import { formatCurrency, formatDate } from '@/lib/format';
import type { ReceivableDTO, ReceivableStatus, ReceivableTotals, ReminderResponse } from '@/types/receivable';
import type { Locale } from '@/i18n/config';

type ListResponse = {
  receivables: ReceivableDTO[];
  totals: ReceivableTotals;
};

type StatusFilter = 'ALL' | ReceivableStatus;
const FILTERS: StatusFilter[] = ['ALL', 'OPEN', 'OVERDUE', 'PAID'];

const statusVariant: Record<ReceivableStatus, 'neutral' | 'danger' | 'success'> = {
  OPEN: 'neutral',
  OVERDUE: 'danger',
  PAID: 'success',
};

export default function ScadenzarioPage() {
  const t = useTranslations('scadenzario');
  const locale = useLocale() as Locale;
  const qc = useQueryClient();
  // Viewer: every create/edit control below is disabled (the server refuses
  // them anyway — requireEditorRole). The reminder draft stays available: it
  // only reads the receivable and writes nothing.
  const readOnlyRole = useIsReadOnlyRole();
  // Editor: can create/edit receivables but not delete one (server-side
  // requireManagerRole on DELETE) — the delete button needs its own gate,
  // narrower than readOnlyRole (which would still show it to an editor).
  const isManager = useIsManager();
  const tSettings = useTranslations('settings');
  const readOnlyTitle = readOnlyRole ? tSettings('readOnlyRoleShort') : undefined;
  const managerOnlyTitle = !isManager ? tSettings('managerOnlyShort') : undefined;

  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderEmail, setReminderEmail] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  /** Save error for the create dialog — rendered inside it, next to Save. */
  const [createError, setCreateError] = useState<string | null>(null);

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['receivables', filter],
    queryFn: () => {
      const q = filter === 'ALL' ? '' : `?status=${filter}`;
      return apiFetch<ListResponse>(`/api/receivables${q}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: ReceivableFormValues) =>
      apiFetch<{ receivable: ReceivableDTO }>('/api/receivables', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setCreateError(null);
      setFormOpen(false);
      qc.invalidateQueries({ queryKey: ['receivables'] });
      toast(t('toast.created'));
    },
    // The dialog stays open on failure, so the message must be shown INSIDE it
    // (see saveError below) — the page banner would render behind the overlay.
    onError: () => setCreateError(t('toast.createError')),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ receivable: ReceivableDTO }>(`/api/receivables/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PAID' }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      toast(t('toast.paid'));
    },
    onError: () => toast(t('toast.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/receivables/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      toast(t('toast.deleted'));
    },
    onError: () => toast(t('toast.error')),
  });

  const reminderMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<ReminderResponse>(`/api/receivables/${id}/reminder`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
  });

  const handleGenerateReminder = (r: ReceivableDTO) => {
    reminderMutation.reset();
    setReminderEmail(r.customerEmail);
    setReminderOpen(true);
    reminderMutation.mutate(r.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('confirmDelete'))) deleteMutation.mutate(id);
  };

  const receivables = data?.receivables ?? [];
  const totals = data?.totals ?? { open: 0, overdue: 0, openAmount: 0, overdueAmount: 0 };
  const rowPending = markPaidMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { count: receivables.length })}
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)} disabled={readOnlyRole} title={readOnlyTitle}>
            <Plus className="h-4 w-4" />
            {t('addButton')}
          </Button>
        }
      />

      {toastMsg && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-3 text-sm text-foreground">
          {toastMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'secondary' : 'ghost'}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? t('all') : t(`status.${f}`)}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {t('openCount', { count: totals.open })} · {t('overdueCount', { count: totals.overdue })}
        </span>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : receivables.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.customer')}</TableHead>
                <TableHead>{t('table.invoice')}</TableHead>
                <TableHead className="text-right">{t('table.amount')}</TableHead>
                <TableHead>{t('table.due')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead className="text-right">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receivables.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.customerName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.invoiceNumber ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(r.amount, locale, r.currency)}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDate(r.dueDate, locale)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status]}>{t(`status.${r.status}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {r.status !== 'PAID' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleGenerateReminder(r)}
                            title={t('actions.generateReminder')}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={rowPending || readOnlyRole}
                            onClick={() => markPaidMutation.mutate(r.id)}
                            title={readOnlyTitle ?? t('actions.markPaid')}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={rowPending || !isManager}
                        onClick={() => handleDelete(r.id)}
                        title={readOnlyTitle ?? managerOnlyTitle ?? t('actions.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ReceivableFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          // Closing and reopening must not resurrect the previous failure.
          if (!open) setCreateError(null);
        }}
        onSubmit={(values) => {
          setCreateError(null);
          createMutation.mutate(values);
        }}
        pending={createMutation.isPending}
        saveError={createError}
      />

      <ReminderDialog
        open={reminderOpen}
        onOpenChange={(open) => {
          setReminderOpen(open);
          if (!open) reminderMutation.reset();
        }}
        loading={reminderMutation.isPending}
        error={reminderMutation.isError}
        variants={reminderMutation.data?.variants ?? null}
        customerEmail={reminderEmail}
      />
    </div>
  );
}
