'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
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
import {
  RecurringExpenseFormDialog,
  type RecurringExpenseFormValues,
} from '@/components/recurring-expenses/recurring-expense-form-dialog';
import { apiFetch } from '@/lib/api/fetcher';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  RecurringExpenseDTO,
  RecurringExpenseTotals,
  ExpenseFrequency,
} from '@/types/recurring-expense';
import type { Locale } from '@/i18n/config';

type ListResponse = {
  expenses: RecurringExpenseDTO[];
  totals: RecurringExpenseTotals;
};

const frequencyVariant: Record<ExpenseFrequency, 'info' | 'neutral'> = {
  MONTHLY: 'info',
  YEARLY: 'neutral',
};

export default function SpeseRicorrentiPage() {
  const t = useTranslations('speseRicorrenti');
  const locale = useLocale() as Locale;
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpenseDTO | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  /** Save error for the create/edit dialog — rendered inside it, next to Save. */
  const [formError, setFormError] = useState<string | null>(null);

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: () => apiFetch<ListResponse>('/api/recurring-expenses'),
  });

  const createMutation = useMutation({
    mutationFn: (values: RecurringExpenseFormValues) =>
      apiFetch<{ expense: RecurringExpenseDTO }>('/api/recurring-expenses', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setFormError(null);
      setFormOpen(false);
      qc.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast(t('toast.created'));
    },
    // The dialog stays open on failure, so the message must be shown INSIDE it
    // (see saveError below) — the page banner would render behind the overlay.
    onError: () => setFormError(t('toast.createError')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: RecurringExpenseFormValues }) =>
      apiFetch<{ expense: RecurringExpenseDTO }>(`/api/recurring-expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setFormError(null);
      setFormOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast(t('toast.updated'));
    },
    onError: () => setFormError(t('toast.error')),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch<{ expense: RecurringExpenseDTO }>(`/api/recurring-expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast(vars.active ? t('toast.reactivated') : t('toast.cancelled'));
    },
    onError: () => toast(t('toast.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/recurring-expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast(t('toast.deleted'));
    },
    onError: () => toast(t('toast.error')),
  });

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: RecurringExpenseDTO) => {
    setEditing(r);
    setFormOpen(true);
  };
  const handleSubmit = (values: RecurringExpenseFormValues) => {
    setFormError(null);
    if (editing) updateMutation.mutate({ id: editing.id, values });
    else createMutation.mutate(values);
  };
  const handleDelete = (id: string) => {
    if (window.confirm(t('confirmDelete'))) deleteMutation.mutate(id);
  };

  const expenses = data?.expenses ?? [];
  const totals = data?.totals ?? { totalMonthly: 0, totalYearly: 0 };
  const displayCurrency = expenses.find((e) => e.active)?.currency ?? 'EUR';
  const formPending = createMutation.isPending || updateMutation.isPending;
  const rowPending = toggleMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button size="sm" onClick={openAdd}>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('totalMonthly')}
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
            {formatCurrency(totals.totalMonthly, locale, displayCurrency)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">{t('perMonth')}</span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('totalYearly')}
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
            {formatCurrency(totals.totalYearly, locale, displayCurrency)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">{t('perYear')}</span>
          </p>
        </div>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.vendor')}</TableHead>
                <TableHead className="text-right">{t('table.amount')}</TableHead>
                <TableHead>{t('table.frequency')}</TableHead>
                <TableHead>{t('table.category')}</TableHead>
                <TableHead>{t('table.nextRenewal')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead className="text-right">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((r) => (
                <TableRow key={r.id} className={cn(!r.active && 'opacity-60')}>
                  <TableCell className={cn('font-medium', !r.active && 'line-through')}>
                    {r.vendorName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(r.amount, locale, r.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={frequencyVariant[r.frequency]}>{t(`frequency.${r.frequency}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.category ?? '—'}</TableCell>
                  <TableCell className="tabular-nums">
                    {r.nextRenewal ? formatDate(r.nextRenewal, locale) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.active ? 'success' : 'neutral'}>
                      {r.active ? t('status.active') : t('status.cancelled')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title={t('actions.edit')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={rowPending}
                        onClick={() => toggleMutation.mutate({ id: r.id, active: !r.active })}
                        title={r.active ? t('actions.cancel') : t('actions.reactivate')}
                      >
                        {r.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={rowPending}
                        onClick={() => handleDelete(r.id)}
                        title={t('actions.delete')}
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

      <RecurringExpenseFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
            // Closing and reopening must not resurrect the previous failure.
            setFormError(null);
          }
        }}
        onSubmit={handleSubmit}
        pending={formPending}
        initial={editing}
        saveError={formError}
      />
    </div>
  );
}
