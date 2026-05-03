'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Cloud, Database, Pencil, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { OnboardingProgress } from './progress-bar';
import {
  INDUSTRIES,
  INDUSTRY_ICON,
  IMPORT_MODES,
  SIZES,
  TEMPLATES,
  companySchema,
  type CompanyValues
} from '@/lib/onboarding';
import { useSession } from '@/lib/session-store';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const TOTAL_STEPS = 5;

type ImportMode = (typeof IMPORT_MODES)[number];
type Template = (typeof TEMPLATES)[number];

const COUNTRIES = ['IT', 'GB', 'US', 'DE', 'FR', 'ES', 'NL', 'CH', 'AT', 'BE'];
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

export function OnboardingFlow() {
  const t = useTranslations('onboarding');
  const tc = useTranslations('common');
  const router = useRouter();
  const completeOnboarding = useSession((s) => s.completeOnboarding);

  const [step, setStep] = useState(1);
  const [company, setCompany] = useState<CompanyValues | null>(null);
  const [importMode, setImportMode] = useState<ImportMode | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleFinish = () => {
    completeOnboarding();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <OnboardingProgress current={step} total={TOTAL_STEPS} />

      <div className="container max-w-3xl py-10 md:py-14">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepShell key="s1" onNext={next}>
              <Step1 onNext={next} />
            </StepShell>
          )}
          {step === 2 && (
            <StepShell key="s2">
              <Step2
                defaults={company}
                onBack={back}
                onSubmit={(values) => {
                  setCompany(values);
                  next();
                }}
              />
            </StepShell>
          )}
          {step === 3 && (
            <StepShell key="s3">
              <Step3
                value={importMode}
                onBack={back}
                onSelect={(mode) => {
                  setImportMode(mode);
                  next();
                }}
              />
            </StepShell>
          )}
          {step === 4 && (
            <StepShell key="s4">
              <Step4
                value={template}
                onBack={back}
                onSelect={(tpl) => {
                  setTemplate(tpl);
                  next();
                }}
              />
            </StepShell>
          )}
          {step === 5 && (
            <StepShell key="s5">
              <Step5
                company={company}
                importMode={importMode}
                template={template}
                onBack={back}
                onFinish={handleFinish}
              />
            </StepShell>
          )}
        </AnimatePresence>

        <p className="mt-6 text-center text-xs text-slate-400">
          {t('progress', { current: step, total: TOTAL_STEPS })} ·{' '}
          <button onClick={() => router.push('/dashboard')} className="hover:underline">
            {tc('skip')}
          </button>
        </p>
      </div>
    </div>
  );
}

function StepShell({ children, onNext: _onNext }: { children: React.ReactNode; onNext?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-card md:p-10"
    >
      {children}
    </motion.div>
  );
}

function Step1({ onNext }: { onNext: () => void }) {
  const t = useTranslations('onboarding.step1');
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary text-white"
      >
        <Sparkles className="h-9 w-9" />
      </motion.div>
      <h1 className="mt-6 font-heading text-3xl font-bold text-slate-900 md:text-4xl">
        {t('title')}
      </h1>
      <p className="mt-3 text-slate-600">{t('subtitle')}</p>
      <Button size="lg" className="mt-8" onClick={onNext}>
        {t('cta')}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function Step2({
  defaults,
  onBack,
  onSubmit
}: {
  defaults: CompanyValues | null;
  onBack: () => void;
  onSubmit: (values: CompanyValues) => void;
}) {
  const t = useTranslations('onboarding.step2');
  const tc = useTranslations('common');
  const form = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues: defaults ?? {
      name: '',
      industry: 'saas',
      size: 'small',
      country: 'IT',
      currency: 'EUR',
      website: '',
      logoUrl: ''
    }
  });

  const { register, handleSubmit, setValue, watch, formState } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2 className="font-heading text-2xl font-bold text-slate-900">{t('title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label={t('fields.name')} error={formState.errors.name?.message}>
          <Input placeholder="Acme Inc." {...register('name')} />
        </Field>

        <Field label={t('fields.industry')}>
          <Select
            value={watch('industry')}
            onValueChange={(v) => setValue('industry', v as (typeof INDUSTRIES)[number])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  <span className="mr-2">{INDUSTRY_ICON[ind]}</span>
                  {t(`industries.${ind}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={t('fields.size')}>
          <Select
            value={watch('size')}
            onValueChange={(v) => setValue('size', v as (typeof SIZES)[number])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`sizes.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={t('fields.country')}>
          <Select value={watch('country')} onValueChange={(v) => setValue('country', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={t('fields.currency')}>
          <Select value={watch('currency')} onValueChange={(v) => setValue('currency', v)}>
            <SelectTrigger>
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
        </Field>

        <Field label={t('fields.website')}>
          <Input placeholder="https://acme.com" {...register('website')} />
        </Field>

        <div className="md:col-span-2">
          <Field label={t('fields.logo')}>
            <Input placeholder="https://acme.com/logo.png" {...register('logoUrl')} />
          </Field>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tc('back')}
        </Button>
        <Button type="submit">
          {tc('continue')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

const IMPORT_ICON: Record<ImportMode, React.ComponentType<{ className?: string }>> = {
  upload: Upload,
  connect: Cloud,
  manual: Pencil,
  skip: Database
};

function Step3({
  value,
  onBack,
  onSelect
}: {
  value: ImportMode | null;
  onBack: () => void;
  onSelect: (m: ImportMode) => void;
}) {
  const t = useTranslations('onboarding.step3');
  const tc = useTranslations('common');
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-slate-900">{t('title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {IMPORT_MODES.map((m) => {
          const Icon = IMPORT_ICON[m];
          const selected = value === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSelect(m)}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                selected
                  ? 'border-primary-accent ring-1 ring-primary-accent'
                  : 'border-slate-200 bg-white'
              )}
            >
              <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-heading text-base font-semibold text-slate-900">
                  {t(`options.${m}.title`)}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">{t(`options.${m}.description`)}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tc('back')}
        </Button>
      </div>
    </div>
  );
}

function Step4({
  value,
  onBack,
  onSelect
}: {
  value: Template | null;
  onBack: () => void;
  onSelect: (t: Template) => void;
}) {
  const t = useTranslations('onboarding.step4');
  const tc = useTranslations('common');
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-slate-900">{t('title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {TEMPLATES.map((tpl) => {
          const selected = value === tpl;
          return (
            <button
              key={tpl}
              type="button"
              onClick={() => onSelect(tpl)}
              className={cn(
                'rounded-lg border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                selected
                  ? 'border-primary-accent ring-1 ring-primary-accent'
                  : 'border-slate-200 bg-white'
              )}
            >
              <div className="flex h-24 items-end gap-1 rounded-md bg-slate-50 p-3">
                {[60, 80, 45, 90, 70].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-primary-accent/70"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <p className="mt-3 font-heading text-base font-semibold text-slate-900">
                {t(`templates.${tpl}.name`)}
              </p>
              <p className="mt-0.5 text-sm text-slate-500">{t(`templates.${tpl}.description`)}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tc('back')}
        </Button>
      </div>
    </div>
  );
}

function Step5({
  company,
  importMode,
  template,
  onBack,
  onFinish
}: {
  company: CompanyValues | null;
  importMode: ImportMode | null;
  template: Template | null;
  onBack: () => void;
  onFinish: () => void;
}) {
  const t = useTranslations('onboarding.step5');
  const tIndustries = useTranslations('onboarding.step2.industries');
  const tImports = useTranslations('onboarding.step3.options');
  const tTemplates = useTranslations('onboarding.step4.templates');
  const tc = useTranslations('common');

  return (
    <div>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success text-white"
        >
          <Check className="h-8 w-8" />
        </motion.div>
        <h2 className="mt-5 font-heading text-2xl font-bold text-slate-900">{t('title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>
      </div>

      <dl className="mx-auto mt-8 max-w-md space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-5">
        <Row label={t('summary.company')} value={company?.name ?? '—'} />
        <Row
          label={t('summary.industry')}
          value={company ? tIndustries(company.industry) : '—'}
        />
        <Row
          label={t('summary.template')}
          value={template ? tTemplates(`${template}.name`) : '—'}
        />
        <Row
          label={t('summary.import')}
          value={importMode ? tImports(`${importMode}.title`) : '—'}
        />
      </dl>

      <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tc('back')}
        </Button>
        <Button size="lg" onClick={onFinish}>
          {t('cta')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
