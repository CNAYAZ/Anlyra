'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CheckCircle2, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ManualFormFinancial, type FinancialFormValues } from '@/components/data/manual-form-financial';
import { ManualFormKpi, type KpiFormValues } from '@/components/data/manual-form-kpi';
import { ManualFormCompetitor, type CompetitorFormValues } from '@/components/data/manual-form-competitor';
import { ManualFormCustomer, type CustomerFormValues } from '@/components/data/manual-form-customer';
import type { ImportTargetKey } from '@/lib/import-targets';

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };
type SaveResult = { batchId: string; recordsCreated: number; errors: [] };

async function saveRecord(targetKey: ImportTargetKey, record: Record<string, unknown>) {
  const res = await fetch('/api/data/manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetKey, records: [record] }),
  });
  const body = (await res.json()) as ApiResult<SaveResult>;
  if (!body.success) throw new Error(body.error);
  return body.data;
}

export default function DataManualPage() {
  const t = useTranslations('dataManual');
  const [tab, setTab] = useState<ImportTargetKey>('financial_records');
  const [toast, setToast] = useState<'success' | 'error' | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const mutation = useMutation({
    mutationFn: ({ key, record }: { key: ImportTargetKey; record: Record<string, unknown> }) =>
      saveRecord(key, record),
    onSuccess: () => {
      setToast('success');
      setResetKey((k) => k + 1);
      setTimeout(() => setToast(null), 5000);
    },
    onError: () => {
      setToast('error');
      setTimeout(() => setToast(null), 5000);
    },
  });

  function submit(key: ImportTargetKey, record: Record<string, unknown>) {
    mutation.mutate({ key, record });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {toast === 'success' && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <div>
              <p className="font-medium">{t('savedSuccessfully')}</p>
              <p className="text-xs">{t('savedDescription')}{' '}
                <Link href="/data/history" className="underline">{t('viewHistory')}</Link>
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setToast(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {toast === 'error' && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          <X className="h-4 w-4" />
          <span>{t('errorGeneric')}</span>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as ImportTargetKey)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="financial_records">{t('tabFinancial')}</TabsTrigger>
          <TabsTrigger value="kpis">{t('tabKpis')}</TabsTrigger>
          <TabsTrigger value="competitors">{t('tabCompetitors')}</TabsTrigger>
          <TabsTrigger value="customer_stats">{t('tabCustomerStats')}</TabsTrigger>
        </TabsList>

        <div className="mt-6 card">
          <TabsContent key={`financial-${resetKey}`} value="financial_records">
            <ManualFormFinancial
              pending={mutation.isPending && tab === 'financial_records'}
              onSubmit={(v: FinancialFormValues) => submit('financial_records', v as unknown as Record<string, unknown>)}
            />
          </TabsContent>

          <TabsContent key={`kpis-${resetKey}`} value="kpis">
            <ManualFormKpi
              pending={mutation.isPending && tab === 'kpis'}
              onSubmit={(v: KpiFormValues) => submit('kpis', v as unknown as Record<string, unknown>)}
            />
          </TabsContent>

          <TabsContent key={`competitors-${resetKey}`} value="competitors">
            <ManualFormCompetitor
              pending={mutation.isPending && tab === 'competitors'}
              onSubmit={(v: CompetitorFormValues) => submit('competitors', v as unknown as Record<string, unknown>)}
            />
          </TabsContent>

          <TabsContent key={`customer-${resetKey}`} value="customer_stats">
            <ManualFormCustomer
              pending={mutation.isPending && tab === 'customer_stats'}
              onSubmit={(v: CustomerFormValues) => submit('customer_stats', v as unknown as Record<string, unknown>)}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
