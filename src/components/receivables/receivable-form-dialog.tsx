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

export type ReceivableFormValues = {
  customerName: string;
  customerEmail?: string;
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
  /**
   * Save error from the caller's mutation. Rendered in the dialog FOOTER, next
   * to the Save button: the page-level banner the parent used to rely on
   * renders BEHIND this modal, so the user saw the spinner stop and nothing
   * else. Empty/undefined renders nothing.
   */
  saveError?: string | null;
};

type Errors = Partial<Record<'customerName' | 'customerEmail' | 'amount' | 'dueDate', string>>;

const EMPTY = {
  customerName: '',
  customerEmail: '',
  amount: '',
  currency: 'EUR',
  invoiceNumber: '',
  issuedDate: '',
  dueDate: '',
  notes: '',
};

// Light client-side check; the server is the source of truth (zod .email()).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ReceivableFormDialog({ open, onOpenChange, onSubmit, pending, saveError }: Props) {
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
    const email = form.customerEmail.trim();
    if (!form.customerName.trim()) next.customerName = t('form.errorCustomerName');
    if (email && !EMAIL_RE.test(email)) next.customerEmail = t('form.errorEmail');
    if (!form.amount || !Number.isFinite(amountNum) || amountNum <= 0) next.amount = t('form.errorAmount');
    if (!form.dueDate) next.dueDate = t('form.errorDueDate');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      customerName: form.customerName.trim(),
      customerEmail: email || undefined,
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

            <Field
              id="customerEmail"
              label={`${t('form.customerEmail')} (${t('form.optional')})`}
              error={errors.customerEmail}
            >
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.customerEmail}
                onChange={set('customerEmail')}
              />
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
