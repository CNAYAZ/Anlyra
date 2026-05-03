'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { costSchema, type CostInput } from '@/lib/validators';
import { FormField } from './form-field';
import { postJson } from '@/lib/fetcher';
import { useToast } from '@/components/ui/toaster';

const CATEGORIES = ['salary', 'rent', 'marketing', 'software', 'utilities', 'other'] as const;
const CURRENCIES = ['EUR', 'USD', 'GBP'];

export function CostForm({ onSaved }: { onSaved?: () => void }) {
  const t = useTranslations('manual');
  const tc = useTranslations('manual.cost.categories');
  const tv = useTranslations('manual.validation');
  const common = useTranslations('common');
  const tp = useTranslations('manual.placeholders');
  const ti = useTranslations('import.field');
  const { toast } = useToast();

  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CostInput>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10) as unknown as Date,
      amount: 0 as unknown as number,
      currency: 'EUR',
      category: 'salary',
      description: '',
      recurring: false,
    },
  });

  const submit = async (data: CostInput, addAnother: boolean) => {
    try {
      await postJson('/api/data/manual', { type: 'COST', data });
      toast({ title: t('toast.saved'), variant: 'success' });
      if (addAnother) {
        reset({ ...data, amount: 0 as unknown as number, description: '' });
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

  const mapError = (key?: string) => (key ? tv(key as 'required' | 'invalidDate' | 'invalidAmount' | 'positive') : undefined);

  return (
    <form
      onSubmit={handleSubmit((d) => submit(d, false))}
      className="grid gap-4 md:grid-cols-2"
    >
      <FormField id="date" label={ti('date')} required error={mapError(errors.date?.message)}>
        <Input id="date" type="date" {...register('date')} />
      </FormField>
      <FormField id="amount" label={ti('amount')} required error={mapError(errors.amount?.message)}>
        <Input
          id="amount"
          inputMode="decimal"
          placeholder={tp('amount')}
          {...register('amount')}
        />
      </FormField>
      <FormField id="currency" label={ti('currency')}>
        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <FormField id="category" label={ti('category')} required>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {tc(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <FormField
        id="description"
        label={ti('description')}
        className="md:col-span-2"
      >
        <Textarea
          id="description"
          placeholder={tp('description')}
          {...register('description')}
        />
      </FormField>
      <FormField id="recurring" label={ti('recurring')} className="md:col-span-2">
        <Controller
          control={control}
          name="recurring"
          render={({ field }) => (
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                id="recurring"
                type="checkbox"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary-accent focus:ring-primary-accent"
              />
              {field.value ? common('yes') : common('no')}
            </label>
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
