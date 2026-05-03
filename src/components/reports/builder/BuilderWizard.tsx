'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, FileDown, Loader2 } from 'lucide-react';
import { Stepper } from './Stepper';
import { ReportPreview } from './ReportPreview';
import {
  REPORT_TYPE_SECTIONS,
  type ReportConfig,
  type ReportSection,
  type ReportType,
  type ReportPeriod,
  type ReportLanguage,
  reportConfigSchema,
} from '@/lib/reports/types';
import { useReportsStore } from '@/lib/reports/store';
import { hasFeature, type Plan } from '@/lib/plans';
import { Lock } from 'lucide-react';

const STEPS = 4;

type DraftConfig = Omit<ReportConfig, 'sections'> & { sections: ReportSection[] };

export function BuilderWizard({ locale, plan }: { locale: string; plan: Plan }) {
  const t = useTranslations('reports.builder');
  const tType = useTranslations('reports.type');
  const tSection = useTranslations('reports.builder.step3');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const addReport = useReportsStore((s) => s.addReport);

  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<DraftConfig>({
    type: 'complete',
    period: '3m',
    sections: REPORT_TYPE_SECTIONS.complete,
    language: locale === 'it' ? 'it' : 'en',
    includeCharts: true,
    title:
      locale === 'it'
        ? `Report ${new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`
        : `Report ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
  });

  const stepperLabels = useMemo(
    () => [
      { label: t('step1.title') },
      { label: t('step2.title') },
      { label: t('step3.title') },
      { label: t('step4.title') },
    ],
    [t]
  );

  const setType = (type: ReportType) => {
    setConfig((c) => ({ ...c, type, sections: REPORT_TYPE_SECTIONS[type] }));
  };
  const toggleSection = (s: ReportSection) => {
    setConfig((c) => ({
      ...c,
      sections: c.sections.includes(s)
        ? c.sections.filter((x) => x !== s)
        : [...c.sections, s],
    }));
  };

  const canProceed = (() => {
    if (step === 0) return !!config.type;
    if (step === 1)
      return (
        config.period !== 'custom' ||
        (!!config.customPeriodFrom && !!config.customPeriodTo)
      );
    if (step === 2) return config.sections.length > 0;
    return true;
  })();

  const visibleSteps = config.type === 'custom' ? [0, 1, 2, 3] : [0, 1, 3];
  const stepIndex = visibleSteps.indexOf(step);
  const next = () => {
    setError(null);
    const i = visibleSteps.indexOf(step);
    if (i < visibleSteps.length - 1) setStep(visibleSteps[i + 1]);
  };
  const back = () => {
    setError(null);
    const i = visibleSteps.indexOf(step);
    if (i > 0) setStep(visibleSteps[i - 1]);
  };

  const isLast = stepIndex === visibleSteps.length - 1;

  const onGenerate = async () => {
    const parsed = reportConfigSchema.safeParse(config);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid configuration');
      return;
    }

    setProgress(0);
    setError(null);

    const tick = window.setInterval(() => {
      setProgress((p) => (p === null ? 0 : Math.min(p + 7, 92)));
    }, 220);

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Generation failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${parsed.data.title.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      addReport({
        id: `rep-${Date.now()}`,
        title: parsed.data.title,
        type: parsed.data.type,
        createdAt: new Date().toISOString(),
        status: 'ready',
        sizeBytes: blob.size,
        shareEnabled: false,
        config: parsed.data,
      });

      setProgress(100);
      window.setTimeout(() => router.push(`/${locale}/reports`), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setProgress(null);
    } finally {
      window.clearInterval(tick);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <Stepper steps={stepperLabels} current={visibleSteps.indexOf(step)} />
            <span className="text-xs text-slate-500">
              {t('step', {
                current: stepIndex + 1,
                total: visibleSteps.length,
              })}
            </span>
          </div>

          {step === 0 && (
            <Step1
              value={config.type}
              onChange={setType}
              tType={tType}
              tBuilder={t}
              plan={plan}
            />
          )}
          {step === 1 && (
            <Step2
              period={config.period}
              from={config.customPeriodFrom}
              to={config.customPeriodTo}
              onChange={(period: ReportPeriod, from?: string, to?: string) =>
                setConfig((c) => ({
                  ...c,
                  period,
                  customPeriodFrom: from,
                  customPeriodTo: to,
                }))
              }
              tBuilder={t}
            />
          )}
          {step === 2 && (
            <Step3
              sections={config.sections}
              onToggle={toggleSection}
              tSection={tSection}
              tBuilder={t}
            />
          )}
          {step === 3 && (
            <Step4
              language={config.language}
              includeCharts={config.includeCharts}
              title={config.title}
              onChange={(patch) => setConfig((c) => ({ ...c, ...patch }))}
              tBuilder={t}
            />
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {progress !== null && (
            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('generating')}
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-primary-accent transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={back}
              disabled={stepIndex === 0 || progress !== null}
              className="btn-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
              {tCommon('back')}
            </button>
            {isLast ? (
              <button
                onClick={onGenerate}
                disabled={!canProceed || progress !== null}
                className="btn-primary"
              >
                <FileDown className="h-4 w-4" />
                {t('generate')}
              </button>
            ) : (
              <button
                onClick={next}
                disabled={!canProceed}
                className="btn-primary"
              >
                {tCommon('next')}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <ReportPreview config={config as ReportConfig} />
    </div>
  );
}

function Step1({
  value,
  onChange,
  tType,
  tBuilder,
  plan,
}: {
  value: ReportType;
  onChange: (v: ReportType) => void;
  tType: (k: string) => string;
  tBuilder: (k: string) => string;
  plan: Plan;
}) {
  const types: ReportType[] = ['complete', 'executive', 'finance', 'market', 'operations', 'custom'];
  const customAllowed = hasFeature(plan, 'customReports');
  return (
    <div>
      <h2 className="font-heading font-semibold text-slate-900">{tBuilder('step1.title')}</h2>
      <p className="text-sm text-slate-500 mt-1">{tBuilder('step1.description')}</p>
      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        {types.map((type) => {
          const locked = type === 'custom' && !customAllowed;
          const active = value === type;
          return (
            <button
              key={type}
              onClick={() => !locked && onChange(type)}
              disabled={locked}
              className={`text-left rounded-lg border-2 p-4 transition-all ${
                active
                  ? 'border-primary-accent bg-primary-accent/5'
                  : 'border-slate-200 hover:border-slate-300'
              } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-900">{tType(type)}</div>
                {locked && <Lock className="h-3.5 w-3.5 text-slate-400" />}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {REPORT_TYPE_SECTIONS[type].length}{' '}
                {tBuilder('step3.title').toLowerCase()}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step2({
  period,
  from,
  to,
  onChange,
  tBuilder,
}: {
  period: ReportPeriod;
  from?: string;
  to?: string;
  onChange: (period: ReportPeriod, from?: string, to?: string) => void;
  tBuilder: (k: string) => string;
}) {
  const options: ReportPeriod[] = ['1m', '3m', '6m', '12m', 'custom'];
  return (
    <div>
      <h2 className="font-heading font-semibold text-slate-900">{tBuilder('step2.title')}</h2>
      <p className="text-sm text-slate-500 mt-1">{tBuilder('step2.description')}</p>
      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
              period === opt
                ? 'border-primary-accent bg-primary-accent/5 text-primary-accent'
                : 'border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            {tBuilder(`step2.${opt}`)}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="label">{tBuilder('step2.from')}</label>
            <input
              type="date"
              value={from ?? ''}
              onChange={(e) => onChange('custom', e.target.value, to)}
              className="input"
            />
          </div>
          <div>
            <label className="label">{tBuilder('step2.to')}</label>
            <input
              type="date"
              value={to ?? ''}
              onChange={(e) => onChange('custom', from, e.target.value)}
              className="input"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Step3({
  sections,
  onToggle,
  tSection,
  tBuilder,
}: {
  sections: ReportSection[];
  onToggle: (s: ReportSection) => void;
  tSection: (k: string) => string;
  tBuilder: (k: string) => string;
}) {
  const all: ReportSection[] = [
    'executive',
    'finance',
    'cashflow',
    'market',
    'operations',
    'projections',
    'benchmark',
    'recommendations',
  ];
  return (
    <div>
      <h2 className="font-heading font-semibold text-slate-900">{tBuilder('step3.title')}</h2>
      <p className="text-sm text-slate-500 mt-1">{tBuilder('step3.description')}</p>
      <div className="grid sm:grid-cols-2 gap-2 mt-5">
        {all.map((s) => {
          const checked = sections.includes(s);
          return (
            <label
              key={s}
              className={`flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition-all ${
                checked
                  ? 'border-primary-accent bg-primary-accent/5'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(s)}
                className="h-4 w-4 rounded border-slate-300 text-primary-accent focus:ring-primary-accent"
              />
              <span className="text-sm font-medium text-slate-800">{tSection(s)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Step4({
  language,
  includeCharts,
  title,
  onChange,
  tBuilder,
}: {
  language: ReportLanguage;
  includeCharts: boolean;
  title: string;
  onChange: (patch: Partial<DraftConfig>) => void;
  tBuilder: (k: string) => string;
}) {
  return (
    <div>
      <h2 className="font-heading font-semibold text-slate-900">{tBuilder('step4.title')}</h2>
      <p className="text-sm text-slate-500 mt-1">{tBuilder('step4.description')}</p>
      <div className="space-y-4 mt-5">
        <div>
          <label className="label">{tBuilder('step1.title')}</label>
          <input
            value={title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="input"
            maxLength={120}
          />
        </div>
        <div>
          <label className="label">{tBuilder('step4.language')}</label>
          <div className="grid grid-cols-2 gap-3">
            {(['it', 'en'] as ReportLanguage[]).map((l) => (
              <button
                key={l}
                onClick={() => onChange({ language: l })}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  language === l
                    ? 'border-primary-accent bg-primary-accent/5 text-primary-accent'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {tBuilder(l === 'it' ? 'step4.languageIt' : 'step4.languageEn')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
          <div>
            <div className="text-sm font-medium text-slate-900">
              {tBuilder('step4.includeCharts')}
            </div>
          </div>
          <button
            onClick={() => onChange({ includeCharts: !includeCharts })}
            role="switch"
            aria-checked={includeCharts}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              includeCharts ? 'bg-primary-accent' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                includeCharts ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
