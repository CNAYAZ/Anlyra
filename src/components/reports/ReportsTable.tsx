'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Eye, Share2, Trash2, FileText } from 'lucide-react';
import { useReportsStore } from '@/lib/reports/store';
import { formatDate } from '@/lib/utils';
import type { GeneratedReport } from '@/lib/reports/types';
import { ShareModal } from './ShareModal';
import type { Plan } from '@/lib/plans';

export function ReportsTable({ locale, plan }: { locale: string; plan: Plan }) {
  const t = useTranslations('reports');
  const reports = useReportsStore((s) => s.reports);
  const removeReport = useReportsStore((s) => s.removeReport);
  const [shareTarget, setShareTarget] = useState<GeneratedReport | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const onDownload = async (report: GeneratedReport) => {
    setDownloadingId(report.id);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(report.config),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-card py-3 font-semibold">{t('table.title')}</th>
                <th className="px-card py-3 font-semibold">{t('table.type')}</th>
                <th className="px-card py-3 font-semibold">{t('table.date')}</th>
                <th className="px-card py-3 font-semibold">{t('table.status')}</th>
                <th className="px-card py-3 font-semibold text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-card py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary-accent/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary-accent" />
                      </div>
                      <div className="font-medium text-slate-900">{r.title}</div>
                    </div>
                  </td>
                  <td className="px-card py-3 text-slate-600">{t(`type.${r.type}`)}</td>
                  <td className="px-card py-3 text-slate-600">{formatDate(r.createdAt, locale)}</td>
                  <td className="px-card py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-card py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onDownload(r)}
                        disabled={downloadingId === r.id}
                        title={t('table.download')}
                        className="btn-ghost p-1.5"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <a
                        href={`/${locale}/reports/${r.id}`}
                        title={t('table.view')}
                        className="btn-ghost p-1.5"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => setShareTarget(r)}
                        title={t('table.share')}
                        className={`btn-ghost p-1.5 ${
                          r.shareEnabled ? 'text-accent' : ''
                        }`}
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeReport(r.id)}
                        title={t('table.delete')}
                        className="btn-ghost p-1.5 text-danger hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ShareModal
        report={shareTarget}
        open={!!shareTarget}
        onClose={() => setShareTarget(null)}
        plan={plan}
        locale={locale}
      />
    </>
  );
}

function StatusBadge({ status }: { status: GeneratedReport['status'] }) {
  const t = useTranslations('reports.status');
  const styles: Record<GeneratedReport['status'], string> = {
    ready: 'bg-success/10 text-success',
    generating: 'bg-warning/10 text-warning',
    failed: 'bg-danger/10 text-danger',
  };
  return <span className={`badge ${styles[status]}`}>{t(status)}</span>;
}
