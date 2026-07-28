'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Download, Share2, Loader2, Copy, Check, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileText } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetcher';
import { formatDate } from '@/lib/utils';

type ReportDetail = {
  id: string;
  title: string;
  description: string | null;
  sections: string[];
  schedule: string | null;
  lastRunAt: string | null;
  createdAt: string;
  renderable: boolean;
  shared: boolean;
  shareToken: string | null;
  shareExpiresAt: string | null;
};

/**
 * Report detail, read from the DATABASE via /api/reports/[id]. It used to look
 * the report up in the browser's zustand/localStorage store, so the page was
 * empty on any other device — and the share link it showed was a token the
 * server had never seen.
 */
export default function ReportDetailPage() {
  const params = useParams<{ locale: string; id: string }>();
  const tCommon = useTranslations('common');
  const tReports = useTranslations('reports');
  const tShare = useTranslations('reports.share');
  const qc = useQueryClient();

  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', params.id],
    queryFn: () => apiFetch<ReportDetail>(`/api/reports/${params.id}`),
  });

  const shareMutation = useMutation({
    mutationFn: () => apiFetch(`/api/reports/${params.id}/share`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report', params.id] }),
    onError: () => setError(tShare('shareFailed')),
  });

  const revokeMutation = useMutation({
    mutationFn: () => apiFetch(`/api/reports/${params.id}/share`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report', params.id] }),
    onError: () => setError(tShare('shareFailed')),
  });

  async function onDownload() {
    if (downloading) return;
    setDownloading(true);
    setError('');
    try {
      // Real PDF, built server-side from this organization's data.
      const res = await fetch(`/api/reports/${params.id}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'RUN_FAILED');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(report?.title ?? 'report').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      qc.invalidateQueries({ queryKey: ['report', params.id] });
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(
        code === 'NO_DATA_FOR_REPORT'
          ? tReports('runNoData')
          : code === 'REPORT_NOT_RENDERABLE'
            ? tReports('notRenderable')
            : tReports('runFailed'),
      );
    } finally {
      setDownloading(false);
    }
  }

  const shareUrl =
    report?.shareToken && typeof window !== 'undefined'
      ? `${window.location.origin}/${params.locale}/share/${report.shareToken}`
      : '';

  async function onCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-md p-8">
        <div className="card">
          <EmptyState icon={FileText} title={tReports('loadFailed')} description="" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <Link
        href={`/${params.locale}/reports`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {tCommon('back')}
      </Link>

      <PageHeader
        title={report.title}
        subtitle={formatDate(report.createdAt, params.locale)}
        actions={
          <button onClick={onDownload} disabled={downloading} className="btn-primary">
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? tReports('running') : tReports('runNow')}
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card space-y-3">
          <h3 className="font-heading font-semibold text-foreground">
            {tReports('sectionsTitle')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.sections.map((s) => (
              <span key={s} className="badge bg-primary-accent/10 text-primary-accent">
                {s.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
          {report.lastRunAt && (
            <p className="text-xs text-muted-foreground">
              {tReports('lastRun')} {formatDate(report.lastRunAt, params.locale)}
            </p>
          )}
        </div>

        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary-accent" />
            <h3 className="font-heading font-semibold text-foreground">{tShare('title')}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{tShare('linkWarning')}</p>

          {report.shared && report.shareToken ? (
            <>
              <div className="flex items-center gap-2">
                <input readOnly value={shareUrl} className="input font-mono text-xs" />
                <button onClick={onCopy} className="btn-secondary shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? tShare('copied') : tShare('copy')}
                </button>
              </div>
              {report.shareExpiresAt && (
                <p className="text-xs text-muted-foreground">
                  {tShare('expiresOn', { date: formatDate(report.shareExpiresAt, params.locale) })}
                </p>
              )}
              <button
                onClick={() => revokeMutation.mutate()}
                disabled={revokeMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10"
              >
                <Trash2 className="h-4 w-4" />
                {revokeMutation.isPending ? tShare('revoking') : tShare('revokeLink')}
              </button>
            </>
          ) : report.shared ? (
            // Shared, but this member is not owner/admin so the token is withheld.
            <p className="text-xs text-muted-foreground">{tShare('managerOnly')}</p>
          ) : (
            <button
              onClick={() => shareMutation.mutate()}
              disabled={shareMutation.isPending}
              className="btn-secondary"
            >
              <Share2 className="h-4 w-4" />
              {shareMutation.isPending ? tShare('creating') : tShare('createLink')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
