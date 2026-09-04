'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';

type SharedReport = {
  title: string;
  description: string | null;
  createdAt: string;
  expiresAt: string | null;
  language: 'it' | 'en';
  sections: string[];
  organization: { name: string; industry: string; country: string };
  period: { from: string; to: string; label: string };
  kpis: {
    revenue: number;
    revenueGrowth: number;
    grossMargin: number | null;
    netMargin: number | null;
    cashRunwayMonths: number | null;
    headcount: number;
  };
  finance: { monthly: Array<{ month: string; revenue: number; costs: number; profit: number }> };
  recommendations: Array<{ title: string; impact: 'high' | 'medium' | 'low'; description: string }>;
};

type State =
  | { status: 'loading' }
  | { status: 'ok'; report: SharedReport }
  | { status: 'gone'; reason: 'NOT_FOUND' | 'EXPIRED' | 'NO_DATA' };

/**
 * Public page behind a share link. It reads the report from the SERVER using the
 * token in the URL — the previous version looked the token up in the visitor's
 * own localStorage, so the link only ever worked in the browser that created it.
 * Nothing here touches the reports store.
 */
export default function PublicSharePage() {
  const params = useParams<{ locale: string; token: string }>();
  const t = useTranslations('share');
  const [state, setState] = useState<State>({ status: 'loading' });
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(params.token)}`);
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && body?.success) {
          setState({ status: 'ok', report: body.data as SharedReport });
        } else if (res.status === 410) {
          setState({ status: 'gone', reason: 'EXPIRED' });
        } else if (res.status === 422) {
          setState({ status: 'gone', reason: 'NO_DATA' });
        } else {
          setState({ status: 'gone', reason: 'NOT_FOUND' });
        }
      } catch {
        if (!cancelled) setState({ status: 'gone', reason: 'NOT_FOUND' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  async function onDownload() {
    if (downloading) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(params.token)}/pdf`);
      if (!res.ok) throw new Error('DOWNLOAD_FAILED');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(state.status === 'ok' ? state.report.title : 'report').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(t('downloadFailed'));
    } finally {
      setDownloading(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-bg-light p-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
          <div className="card mt-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'gone') {
    const title =
      state.reason === 'EXPIRED'
        ? t('linkExpiredTitle')
        : state.reason === 'NO_DATA'
          ? t('noDataTitle')
          : t('linkUnavailableTitle');
    const description =
      state.reason === 'EXPIRED'
        ? t('linkExpiredDesc')
        : state.reason === 'NO_DATA'
          ? t('noDataDesc')
          : t('linkUnavailableDesc');
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-light p-8">
        <div className="card w-full max-w-md">
          <EmptyState icon={FileText} title={title} description={description} />
        </div>
      </div>
    );
  }

  const { report } = state;
  const nf = new Intl.NumberFormat(params.locale === 'en' ? 'en-US' : 'it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  return (
    <div className="min-h-screen bg-bg-light">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="font-heading text-lg font-bold text-primary">{t('appName')}</div>
          <button onClick={onDownload} disabled={downloading} className="btn-primary">
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? t('downloading') : t('download')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">{report.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.organization.name} • {t('period')}: {report.period.label} •{' '}
            {formatDate(report.createdAt, params.locale)}
          </p>
          {report.description && (
            <p className="mt-2 text-sm text-muted-foreground">{report.description}</p>
          )}
          {report.expiresAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('expiresOn', { date: formatDate(report.expiresAt, params.locale) })}
            </p>
          )}
        </div>

        {downloadError && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {downloadError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="card">
            <p className="text-xs text-muted-foreground">{t('revenue')}</p>
            <p className="font-heading text-xl font-semibold tabular-nums">
              {nf.format(report.kpis.revenue)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-muted-foreground">{t('headcount')}</p>
            <p className="font-heading text-xl font-semibold tabular-nums">
              {report.kpis.headcount}
            </p>
          </div>
        </div>

        {report.finance.monthly.length > 0 && (
          <div className="card overflow-x-auto">
            <h2 className="font-heading mb-3 text-lg font-semibold">{t('monthlyTable')}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2">{t('colMonth')}</th>
                  <th className="py-2 text-right">{t('colRevenue')}</th>
                  <th className="py-2 text-right">{t('colCosts')}</th>
                  <th className="py-2 text-right">{t('colProfit')}</th>
                </tr>
              </thead>
              <tbody>
                {report.finance.monthly.map((m) => (
                  <tr key={m.month} className="border-b border-border/50">
                    <td className="py-2">{m.month}</td>
                    <td className="py-2 text-right tabular-nums">{nf.format(m.revenue)}</td>
                    <td className="py-2 text-right tabular-nums">{nf.format(m.costs)}</td>
                    <td className="py-2 text-right tabular-nums">{nf.format(m.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {report.recommendations.length > 0 && (
          <div className="card space-y-3">
            <h2 className="font-heading text-lg font-semibold">{t('recommendations')}</h2>
            {report.recommendations.map((r) => (
              <div key={r.title} className="border-l-2 border-primary-accent pl-3">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
