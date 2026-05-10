'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  name: z.string().min(1),
  value: z.preprocess(
    (v) => (v === '' ? undefined : Number(String(v).replace(',', '.'))),
    z.number({ required_error: 'Required' }),
  ),
  unit: z.string().optional(),
  target: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(String(v).replace(',', '.'))),
    z.number().optional(),
  ),
});

export type KpiFormValues = z.infer<typeof schema>;

type Props = {
  onSubmit: (values: KpiFormValues) => void;
  pending?: boolean;
};

export function ManualFormKpi({ onSubmit, pending }: Props) {
  const t = useTranslations('dataManual');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KpiFormValues>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="kpi-name">{t('fieldName')} *</Label>
          <Input id="kpi-name" {...register('name')} placeholder="MRR, NPS…" />
          {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="kpi-value">{t('fieldValue')} *</Label>
          <Input id="kpi-value" type="number" step="any" {...register('value')} />
          {errors.value && <p className="text-xs text-danger">{errors.value.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="kpi-unit">{t('fieldUnit')}</Label>
          <Input id="kpi-unit" {...register('unit')} placeholder="%, EUR, #" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="kpi-target">{t('fieldTarget')}</Label>
          <Input id="kpi-target" type="number" step="any" {...register('target')} />
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
