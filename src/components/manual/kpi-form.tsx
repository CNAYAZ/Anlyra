'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { kpiSchema, type KpiInput } from '@/lib/validators';
import { FormField } from './form-field';
import { postJson } from '@/lib/fetcher';
import { useToast } from '@/components/ui/toaster';

const KPI_NAMES = ['churn', 'nps', 'conversion', 'cac', 'ltv', 'mrr', 'arr'] as const;
const UNITS = ['percent', 'eur', 'usd', 'number'] as const;
const UNIT_VALUES: Record<(typeof UNITS)[number], string> = {
  percent: '%',
  eur: 'EUR',
  usd: 'USD',
  number: '#',
};

export function KpiForm({ onSaved }: { onSaved?: () => void }) {
  const t = useTranslations('manual');
  const tn = useTranslations('manual.kpi.names');
  const tu = useTranslations('manual.kpi.units');
  const tv = useTranslations('manual.validation');
  const common = useTranslations('common');
  const ti = useTranslations('import.field');
  const { toast } = useToast();

  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KpiInput>({
    resolver: zodResolver(kpiSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10) as unknown as Date,
      name: 'churn',
      value: 0 as unknown as number,
      target: null,
      unit: '%',
    },
  });

  const submit = async (data: KpiInput, addAnother: boolean) => {
    try {
      await postJson('/api/data/manual', { type: 'KPI', data });
      toast({ title: t('toast.saved'), variant: 'success' });
      if (addAnother) {
        reset({ ...data, value: 0 as unknown as number });
      } else {
        onSaved?.();
      }
    } catch (err) {
      toast({
        title: t('toast.error'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      });
    }
  };

  const mapError = (key?: string) =>
    key ? tv(key as 'required' | 'invalidDate' | 'invalidAmount' | 'positive') : undefined;

  return (
    <form
      onSubmit={handleSubmit((d) => submit(d, false))}
      className="grid gap-4 md:grid-cols-2"
    >
      <FormField id="date" label={ti('date')} required error={mapError(errors.date?.message)}>
        <Input id="date" type="date" {...register('date')} />
      </FormField>
      <FormField id="name" label={ti('name')} required>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="name">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KPI_NAMES.map((k) => (
                  <SelectItem key={k} value={k}>
                    {tn(k)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <FormField id="value" label={ti('value')} required error={mapError(errors.value?.message)}>
        <Input id="value" inputMode="decimal" {...register('value')} />
      </FormField>
      <FormField id="target" label={ti('target')}>
        <Input id="target" inputMode="decimal" {...register('target')} />
      </FormField>
      <FormField id="unit" label={ti('unit')} required>
        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={UNIT_VALUES[u]}>
                    {tu(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <div className="md:col-span-2 flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {common('save')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={handleSubmit((d) => submit(d, true))}
        >
          {common('saveAndAddAnother')}
        </Button>
      </div>
    </form>
  );
}
