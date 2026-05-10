'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const optNum = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : Number(String(v).replace(',', '.'))),
  z.number().optional(),
);

const schema = z.object({
  name: z.string().min(1),
  website: z.string().optional(),
  description: z.string().optional(),
  estimatedRevenue: optNum,
  employees: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Math.round(Number(String(v)))),
    z.number().int().optional(),
  ),
  marketShare: optNum,
});

export type CompetitorFormValues = z.infer<typeof schema>;

type Props = {
  onSubmit: (values: CompetitorFormValues) => void;
  pending?: boolean;
};

export function ManualFormCompetitor({ onSubmit, pending }: Props) {
  const t = useTranslations('dataManual');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompetitorFormValues>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="co-name">{t('fieldName')} *</Label>
          <Input id="co-name" {...register('name')} placeholder="Acme Corp" />
          {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="co-website">{t('fieldWebsite')}</Label>
          <Input id="co-website" {...register('website')} placeholder="https://acme.com" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="co-revenue">{t('fieldEstimatedRevenue')}</Label>
          <Input id="co-revenue" type="number" step="any" {...register('estimatedRevenue')} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="co-employees">{t('fieldEmployees')}</Label>
          <Input id="co-employees" type="number" step="1" {...register('employees')} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="co-share">{t('fieldMarketShare')}</Label>
          <Input id="co-share" type="number" step="0.01" {...register('marketShare')} placeholder="%" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="co-desc">{t('fieldDescription')}</Label>
        <Input id="co-desc" {...register('description')} />
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
