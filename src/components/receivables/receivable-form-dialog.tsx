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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export type ReceivableFormValues = {
  customerName: string;
  amount: number;
  currency: string;
  invoiceNumber?: string;
  issuedDate?: string;
  dueDate: string;
  notes?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ReceivableFormValues) => void;
  pending: boolean;
};

type Errors = Partial<Record<'customerName' | 'amount' | 'dueDate', string>>;

const EMPTY = {
  customerName: '',
  amount: '',
  currency: 'EUR',
  invoiceNumber: '',
  issuedDate: '',
  dueDate: '',
  notes: '',
};

export function ReceivableFormDialog({ open, onOpenChange, onSubmit, pending }: Props) {
  const t = useTranslations('scadenzario');
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Errors>({});

  // Reset the form each time the dialog is opened.
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY });
      setErrors({});
    }
  }, [open]);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    const amountNum = Number(form.amount);
    if (!form.customerName.trim()) next.customerName = t('form.errorCustomerName');
    if (!form.amount || !Number.isFinite(amountNum) || amountNum <= 0) next.amount = t('form.errorAmount');
    if (!form.dueDate) next.dueDate = t('form.errorDueDate');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      customerName: form.customerName.trim(),
      amount: amountNum,
      currency: form.currency.trim() || 'EUR',
      invoiceNumber: form.invoiceNumber.trim() || undefined,
      issuedDate: form.issuedDate || undefined,
      dueDate: form.dueDate,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('form.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <Field id="customerName" label={t('form.customerName')} required error={errors.customerName}>
              <Input value={form.customerName} onChange={set('customerName')} autoFocus />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field id="amount" label={t('form.amount')} required error={errors.amount}>
                <Input type="number" step="0.01" min="0" inputMode="decimal" value={form.amount} onChange={set('amount')} />
              </Field>
              <Field id="currency" label={t('form.currency')}>
                <Input value={form.currency} onChange={set('currency')} maxLength={8} />
              </Field>
            </div>

            <Field id="invoiceNumber" label={`${t('form.invoiceNumber')} (${t('form.optional')})`}>
              <Input value={form.invoiceNumber} onChange={set('invoiceNumber')} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field id="issuedDate" label={`${t('form.issuedDate')} (${t('form.optional')})`}>
                <Input type="date" value={form.issuedDate} onChange={set('issuedDate')} />
              </Field>
              <Field id="dueDate" label={t('form.dueDate')} required error={errors.dueDate}>
                <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
              </Field>
            </div>

            <Field id="notes" label={`${t('form.notes')} (${t('form.optional')})`}>
              <Textarea value={form.notes} onChange={set('notes')} rows={3} />
            </Field>
          </DialogBody>
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
