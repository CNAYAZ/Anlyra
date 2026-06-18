'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const schema = z.object({
  amount: z.preprocess(
    (v) => (v === '' ? undefined : Number(String(v).replace(',', '.'))),
    z.number({ required_error: 'Required' }),
  ),
  type: z.enum(['REVENUE', 'EXPENSE']),
  occurredAt: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  source: z.string().optional(),
});

export type FinancialFormValues = z.infer<typeof schema>;

type Props = {
  onSubmit: (values: FinancialFormValues) => void;
  pending?: boolean;
};

export function ManualFormFinancial({ onSubmit, pending }: Props) {
  const t = useTranslations('dataManual');
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FinancialFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'REVENUE',
      occurredAt: new Date().toISOString().slice(0, 10),
    },
  });

  const typeVal = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fr-amount">{t('fieldAmount')} *</Label>
          <Input id="fr-amount" type="number" step="0.01" {...register('amount')} placeholder="0.00" />
          {errors.amount && <p className="text-xs text-danger">{errors.amount.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>{t('fieldType')} *</Label>
          <Select value={typeVal} onValueChange={(v) => setValue('type', v as 'REVENUE' | 'EXPENSE')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="REVENUE">{t('typeIncome')}</SelectItem>
              <SelectItem value="EXPENSE">{t('typeExpense')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="fr-date">{t('fieldOccurredAt')} *</Label>
          <Input id="fr-date" type="date" {...register('occurredAt')} />
          {errors.occurredAt && <p className="text-xs text-danger">{errors.occurredAt.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="fr-category">{t('fieldCategory')} *</Label>
          <Input id="fr-category" {...register('category')} />
          {errors.category && <p className="text-xs text-danger">{errors.category.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="fr-subcategory">{t('fieldSubcategory')}</Label>
          <Input id="fr-subcategory" {...register('subcategory')} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="fr-source">{t('fieldSource')}</Label>
          <Input id="fr-source" {...register('source')} placeholder="manual" />
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
