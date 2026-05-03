'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { competitorSchema, type CompetitorInput } from '@/lib/validators';
import { FormField } from './form-field';
import { TagInput } from '@/components/ui/tag-input';
import { postJson } from '@/lib/fetcher';
import { useToast } from '@/components/ui/toaster';

export function CompetitorForm({ onSaved }: { onSaved?: () => void }) {
  const t = useTranslations('manual');
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
  } = useForm<CompetitorInput>({
    resolver: zodResolver(competitorSchema),
    defaultValues: {
      name: '',
      website: '',
      description: '',
      estimatedRevenue: null,
      employees: null,
      marketShare: null,
      strengths: [],
      weaknesses: [],
    },
  });

  const submit = async (data: CompetitorInput, addAnother: boolean) => {
    try {
      await postJson('/api/data/manual', { type: 'COMPETITOR', data });
      toast({ title: t('toast.saved'), variant: 'success' });
      if (addAnother) {
        reset({
          name: '',
          website: '',
          description: '',
          estimatedRevenue: null,
          employees: null,
          marketShare: null,
          strengths: [],
          weaknesses: [],
        });
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
      <FormField id="name" label={ti('name')} required error={mapError(errors.name?.message)}>
        <Input id="name" {...register('name')} />
      </FormField>
      <FormField id="website" label={ti('website')}>
        <Input id="website" placeholder={tp('website')} {...register('website')} />
      </FormField>
      <FormField
        id="description"
        label={ti('description')}
        className="md:col-span-2"
      >
        <Textarea id="description" {...register('description')} />
      </FormField>
      <FormField id="estimatedRevenue" label={ti('estimatedRevenue')}>
        <Input
          id="estimatedRevenue"
          inputMode="decimal"
          {...register('estimatedRevenue')}
        />
      </FormField>
      <FormField id="employees" label={ti('employees')}>
        <Input
          id="employees"
          type="number"
          min={0}
          {...register('employees', { valueAsNumber: true })}
        />
      </FormField>
      <FormField
        id="marketShare"
        label={ti('marketShare')}
        className="md:col-span-2"
      >
        <Input id="marketShare" inputMode="decimal" {...register('marketShare')} />
      </FormField>
      <FormField
        id="strengths"
        label={ti('strengths')}
        className="md:col-span-2"
      >
        <Controller
          control={control}
          name="strengths"
          render={({ field }) => (
            <TagInput
              id="strengths"
              value={field.value ?? []}
              onChange={field.onChange}
              placeholder={tp('strengths')}
            />
          )}
        />
      </FormField>
      <FormField
        id="weaknesses"
        label={ti('weaknesses')}
        className="md:col-span-2"
      >
        <Controller
          control={control}
          name="weaknesses"
          render={({ field }) => (
            <TagInput
              id="weaknesses"
              value={field.value ?? []}
              onChange={field.onChange}
              placeholder={tp('weaknesses')}
            />
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
