'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const intField = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : Math.round(Number(String(v)))),
  z.number().int({ message: 'Must be a whole number' }),
);

const schema = z.object({
  period: z.string().min(1, 'Required').regex(/^\d{4}-\d{2}$/, 'Use format YYYY-MM'),
  activeCustomers: intField,
  newCustomers: intField,
  churnedCustomers: intField,
});

export type CustomerFormValues = z.infer<typeof schema>;

type Props = {
  onSubmit: (values: CustomerFormValues) => void;
  pending?: boolean;
};

export function ManualFormCustomer({ onSubmit, pending }: Props) {
  const t = useTranslations('dataManual');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      period: new Date().toISOString().slice(0, 7), // YYYY-MM
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="cs-period">{t('fieldPeriod')} * <span className="text-xs font-normal text-muted-foreground">(YYYY-MM)</span></Label>
          <Input id="cs-period" {...register('period')} placeholder="2024-12" />
          {errors.period && <p className="text-xs text-danger">{errors.period.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="cs-active">{t('fieldActiveCustomers')} *</Label>
          <Input id="cs-active" type="number" step="1" {...register('activeCustomers')} />
          {errors.activeCustomers && <p className="text-xs text-danger">{errors.activeCustomers.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="cs-new">{t('fieldNewCustomers')} *</Label>
          <Input id="cs-new" type="number" step="1" {...register('newCustomers')} />
          {errors.newCustomers && <p className="text-xs text-danger">{errors.newCustomers.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="cs-churned">{t('fieldChurnedCustomers')} *</Label>
          <Input id="cs-churned" type="number" step="1" {...register('churnedCustomers')} />
          {errors.churnedCustomers && <p className="text-xs text-danger">{errors.churnedCustomers.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t('saving') : t('save')}
      </button>
    </form>
  );
}
