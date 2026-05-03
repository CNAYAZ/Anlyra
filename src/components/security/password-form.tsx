'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

const schema = z
  .object({
    current: z.string().min(8, 'Min 8 characters'),
    next: z.string().min(8, 'Min 8 characters'),
    confirm: z.string().min(8, 'Min 8 characters')
  })
  .refine((d) => d.next === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });

type Values = z.infer<typeof schema>;

export function PasswordForm() {
  const t = useTranslations('security.password');
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState } = useForm<Values>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (_values: Values) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSaved(true);
    reset();
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="current">{t('current')}</Label>
            <Input id="current" type="password" {...register('current')} />
            {formState.errors.current ? (
              <p className="text-xs text-danger">{formState.errors.current.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="next">{t('new')}</Label>
            <Input id="next" type="password" {...register('next')} />
            {formState.errors.next ? (
              <p className="text-xs text-danger">{formState.errors.next.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">{t('confirm')}</Label>
            <Input id="confirm" type="password" {...register('confirm')} />
            {formState.errors.confirm ? (
              <p className="text-xs text-danger">{formState.errors.confirm.message}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting}>
              {t('cta')}
            </Button>
            {saved ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> {t('success')}
              </span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
