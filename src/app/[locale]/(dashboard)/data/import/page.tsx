'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/section';
import { ImportTargetSelector } from '@/components/data/import-target-selector';
import { ImportUploader } from '@/components/data/import-uploader';
import { ImportMapper, type ColumnInfo } from '@/components/data/import-mapper';
import { ImportPreview } from '@/components/data/import-preview';
import { ImportResult, type ImportBatchResult } from '@/components/data/import-result';
import { getImportTarget, type ImportTargetKey } from '@/lib/import-targets';

type Step = 'target' | 'upload' | 'mapping' | 'preview' | 'importing' | 'result';

type PreviewResponse = {
  batchId: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  columns: ColumnInfo[];
  suggestedMapping: Record<string, string | null>;
  previewRows: Record<string, unknown>[];
  allRows: Record<string, unknown>[];
};

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

const STEPS: Step[] = ['target', 'upload', 'mapping', 'preview', 'result'];

export default function DataImportPage() {
  const t = useTranslations('dataImport');
  const [step, setStep] = useState<Step>('target');
  const [targetKey, setTargetKey] = useState<ImportTargetKey | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [suggested, setSuggested] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<ImportBatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const target = targetKey ? getImportTarget(targetKey) : null;

  const previewMutation = useMutation({
    mutationFn: async ({ file, key }: { file: File; key: ImportTargetKey }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('targetKey', key);
      const res = await fetch('/api/data/import/preview', { method: 'POST', body: fd });
      const body = (await res.json()) as ApiResult<PreviewResponse>;
      if (!body.success) throw new Error(body.error);
      return body.data;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setMapping(data.suggestedMapping);
      setSuggested(data.suggestedMapping);
      setError(null);
      setStep('mapping');
    },
    onError: (e) => setError((e as Error).message),
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!previewData || !targetKey) throw new Error('NO_PREVIEW');
      const res = await fetch('/api/data/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: previewData.batchId,
          targetKey,
          mapping,
          rows: previewData.allRows,
          fileName: previewData.fileName,
          fileSize: previewData.fileSize,
        }),
      });
      const body = (await res.json()) as ApiResult<ImportBatchResult>;
      if (!body.success) throw new Error(body.error);
      return body.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      setStep('result');
    },
    onError: (e) => {
      setError((e as Error).message);
      setStep('preview');
    },
  });

  // Cancel the PENDING batch server-side (status -> CANCELLED), then reset.
  const cancelMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await fetch(`/api/data/import/batches/${batchId}`, { method: 'DELETE' });
      const body = (await res.json()) as ApiResult<{ id: string; status: string }>;
      if (!body.success) throw new Error(body.error);
      return body.data;
    },
  });

  function reset() {
    setStep('target');
    setTargetKey(null);
    setPreviewData(null);
    setMapping({});
    setSuggested({});
    setResult(null);
    setError(null);
  }

  function cancelImport() {
    if (previewData?.batchId) cancelMutation.mutate(previewData.batchId);
    reset();
  }

  function goBack() {
    if (step === 'upload') setStep('target');
    else if (step === 'mapping') setStep('upload');
    else if (step === 'preview') setStep('mapping');
  }

  function canProceedFromMapping(): boolean {
    if (!target) return false;
    const used = new Set(Object.values(mapping).filter(Boolean) as string[]);
    return target.fields.filter((f) => f.required).every((f) => used.has(f.key));
  }

  function startImport() {
    setStep('importing');
    commitMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Stepper current={step} />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          <X className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {step === 'target' && (
        <ImportTargetSelector
          value={targetKey}
          onChange={(k) => {
            setTargetKey(k);
            setStep('upload');
          }}
        />
      )}

      {step === 'upload' && targetKey && (
        <ImportUploader
          pending={previewMutation.isPending}
          error={previewMutation.error ? (previewMutation.error as Error).message : null}
          onFileAccepted={(file) => previewMutation.mutate({ file, key: targetKey })}
        />
      )}

      {step === 'mapping' && previewData && target && (
        <ImportMapper
          target={target}
          columns={previewData.columns}
          mapping={mapping}
          suggested={suggested}
          onChange={setMapping}
        />
      )}

      {step === 'preview' && previewData && target && (
        <ImportPreview target={target} rows={previewData.allRows} mapping={mapping} />
      )}

      {step === 'importing' && (
        <div className="card flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary-accent" />
          <div>
            <p className="text-sm font-medium">{t('importing')}</p>
            <p className="text-xs text-muted-foreground">{t('importingDescription')}</p>
          </div>
        </div>
      )}

      {step === 'result' && result && <ImportResult result={result} onReset={reset} />}

      {(step === 'upload' || step === 'mapping' || step === 'preview') && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> {t('back')}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelImport}
              disabled={cancelMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              {cancelMutation.isPending ? t('cancelling') : t('cancel')}
            </button>
            {step === 'mapping' && (
              <button
                type="button"
                disabled={!canProceedFromMapping()}
                onClick={() => setStep('preview')}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
                  canProceedFromMapping()
                    ? 'bg-primary-accent text-white hover:opacity-90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
              >
                {t('confirm')} <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {step === 'preview' && (
              <button
                type="button"
                onClick={startImport}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                {t('confirm')} <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  const t = useTranslations('dataImport');
  const labels: Record<Step, string> = {
    target: t('stepTarget'),
    upload: t('stepUpload'),
    mapping: t('stepMapping'),
    preview: t('stepPreview'),
    importing: t('stepPreview'),
    result: t('stepResult'),
  };
  const visualCurrent: Step = current === 'importing' ? 'preview' : current;
  const currentIdx = STEPS.indexOf(visualCurrent);
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {STEPS.map((s, i) => {
        const done = i < currentIdx || current === 'result';
        const active = i === currentIdx && current !== 'result';
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold',
                done && 'border-success bg-success/10 text-success',
                active && 'border-primary-accent bg-primary-accent/10 text-primary-accent',
                !done && !active && 'border-border bg-card text-muted-foreground',
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={cn('text-sm', active ? 'font-medium' : 'text-muted-foreground')}>
              {labels[s]}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 hidden h-px w-6 bg-border sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
