'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExpenseFrequency, RecurringExpenseDTO } from '@/types/recurring-expense';

export type RecurringExpenseFormValues = {
  vendorName: string;
  amount: number;
  currency: string;
  frequency: ExpenseFrequency;
  category?: string;
  nextRenewal?: string;
  notes?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RecurringExpenseFormValues) => void;
  pending: boolean;
  /** When set, the dialog is in edit mode and prefills from this record. */
  initial?: RecurringExpenseDTO | null;
  /**
   * Save error from the caller's mutation. Rendered in the dialog FOOTER, next
   * to the Save button: the page-level banner the parent used to rely on
   * renders BEHIND this modal, so the user saw the spinner stop and nothing
   * else. Empty/undefined renders nothing.
   */
  saveError?: string | null;
};

type Errors = Partial<Record<'vendorName' | 'amount', string>>;

const EMPTY = {
  vendorName: '',
  amount: '',
  currency: 'EUR',
  frequency: 'MONTHLY' as ExpenseFrequency,
  category: '',
  nextRenewal: '',
  notes: '',
};

// Same look as <Input>, applied to the native <select>.
const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-border-strong bg-input-bg px-3.5 text-[13.5px] text-foreground ' +
  'transition-all duration-150 hover:border-sage-500/60 ' +
  'focus:border-sage-500 focus:ring-[3px] focus:ring-sage-500/25 focus:outline-none';

export function RecurringExpenseFormDialog({ open, onOpenChange, onSubmit, pending, initial, saveError }: Props) {
  const t = useTranslations('speseRicorrenti');
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Errors>({});

  // Seed from `initial` (edit) or reset to empty (add) each time it opens.
  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (initial) {
      setForm({
        vendorName: initial.vendorName,
        amount: String(initial.amount),
        currency: initial.currency,
        frequency: initial.frequency,
        category: initial.category ?? '',
        nextRenewal: initial.nextRenewal ? initial.nextRenewal.slice(0, 10) : '',
        notes: initial.notes ?? '',
      });
    } else {
      setForm({ ...EMPTY });
    }
  }, [open, initial]);

  const set = (key: keyof typeof EMPTY) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    const amountNum = Number(form.amount);
    if (!form.vendorName.trim()) next.vendorName = t('form.errorVendor');
    if (!form.amount || !Number.isFinite(amountNum) || amountNum <= 0) next.amount = t('form.errorAmount');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      vendorName: form.vendorName.trim(),
      amount: amountNum,
      currency: form.currency.trim() || 'EUR',
      frequency: form.frequency,
      category: form.category.trim() || undefined,
      nextRenewal: form.nextRenewal || undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? t('form.editTitle') : t('form.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <Field id="vendorName" label={t('form.vendorName')} required error={errors.vendorName}>
              <Input value={form.vendorName} onChange={set('vendorName')} autoFocus />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field id="amount" label={t('form.amount')} required error={errors.amount}>
                <Input type="number" step="0.01" min="0" inputMode="decimal" value={form.amount} onChange={set('amount')} />
              </Field>
              <Field id="currency" label={t('form.currency')}>
                <Input value={form.currency} onChange={set('currency')} maxLength={8} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field id="frequency" label={t('form.frequency')}>
                <select className={cn(SELECT_CLASS)} value={form.frequency} onChange={set('frequency')}>
                  <option value="MONTHLY">{t('frequency.MONTHLY')}</option>
                  <option value="YEARLY">{t('frequency.YEARLY')}</option>
                </select>
              </Field>
              <Field id="category" label={`${t('form.category')} (${t('form.optional')})`}>
                <Input value={form.category} onChange={set('category')} maxLength={100} />
              </Field>
            </div>

            <Field id="nextRenewal" label={`${t('form.nextRenewal')} (${t('form.optional')})`}>
              <Input type="date" value={form.nextRenewal} onChange={set('nextRenewal')} />
            </Field>

            <Field id="notes" label={`${t('form.notes')} (${t('form.optional')})`}>
              <Textarea value={form.notes} onChange={set('notes')} rows={3} />
            </Field>
          </DialogBody>
          {/* Save error lives with the Save button, inside the dialog — the
              parent page's banner is behind the modal overlay and unreadable. */}
          <FormError className="mx-6 mb-2">{saveError}</FormError>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              {t('form.cancel')}
            </Button>
            <Button type="submit" loading={pending}>
              {t('form.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
