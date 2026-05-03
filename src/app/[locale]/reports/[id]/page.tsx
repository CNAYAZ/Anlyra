'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Download, Share2, Loader2 } from 'lucide-react';
import { useReportsStore } from '@/lib/reports/store';
import { ReportPreview } from '@/components/reports/builder/ReportPreview';
import { ShareModal } from '@/components/reports/ShareModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDate } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth/current-user';

export default function ReportDetailPage() {
  const params = useParams<{ locale: string; id: string }>();
  const tCommon = useTranslations('common');
  const tReports = useTranslations('reports');
  const tBuilder = useTranslations('reports.builder');
  const reports = useReportsStore((s) => s.reports);
  const report = reports.find((r) => r.id === params.id);
  const user = getCurrentUser();
  const [shareOpen, setShareOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!report) return notFound();

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
    <div className="p-8 max-w-6xl mx-auto">
      <Link
        href={`/${params.locale}/reports`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-3"
      >
        <ChevronLeft className="h-4 w-4" />
        {tCommon('back')}
      </Link>
      <PageHeader
        title={report.title}
        subtitle={`${tReports(`type.${report.type}`)} • ${formatDate(
          report.createdAt,
          params.locale
        )}`}
        actions={
          <>
            <button
              onClick={() => setShareOpen(true)}
              className="btn-secondary"
            >
              <Share2 className="h-4 w-4" />
              {tReports('table.share')}
            </button>
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
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card">
          <h3 className="font-heading font-semibold text-slate-900 mb-3">
            {tBuilder('step3.title')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.config.sections.map((s) => (
              <span key={s} className="badge bg-primary-accent/10 text-primary-accent">
                {tBuilder(`step3.${s}`)}
              </span>
            ))}
          </div>
        </div>
        <ReportPreview config={report.config} />
      </div>

      <ShareModal
        report={report}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        plan={user.plan}
        locale={params.locale}
      />
    </div>
  );
}
