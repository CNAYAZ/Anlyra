'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useReportsStore } from '@/lib/reports/store';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReportPreview } from '@/components/reports/builder/ReportPreview';
import { formatDate } from '@/lib/utils';

export default function PublicSharePage() {
  const params = useParams<{ locale: string; token: string }>();
  const tReports = useTranslations('reports');
  const t = useTranslations('share');
  const reports = useReportsStore((s) => s.reports);
  const [hydrated, setHydrated] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-bg-light p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
          <div className="card mt-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const report = reports.find(
    (r) => r.shareEnabled && r.shareToken === params.token
  );

  if (!report) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center p-8">
        <div className="card max-w-md w-full">
          <EmptyState
            icon={FileText}
            title={t('linkUnavailableTitle')}
            description={t('linkUnavailableDesc')}
          />
        </div>
      </div>
    );
  }

  const onDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(report.config),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-heading font-bold text-primary text-lg">{t('appName')}</div>
          <button
            onClick={onDownload}
            disabled={downloading}
            className="btn-primary"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {tReports('table.download')}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 lg:p-10">
        <h1 className="text-3xl font-heading font-bold text-slate-900">
          {report.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {tReports(`type.${report.type}`)} •{' '}
          {formatDate(report.createdAt, params.locale)}
        </p>
        <div className="mt-8 max-w-md">
          <ReportPreview config={report.config} />
        </div>
      </main>
    </div>
  );
}
