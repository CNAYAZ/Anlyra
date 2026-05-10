'use client';

export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Calendar, Clock, Mail, Plus } from 'lucide-react';
import { useAppLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/utils';
import { apiFetch } from '@/lib/api/fetcher';
import { Skeleton } from '@/components/ui/skeleton';

type Report = {
  id: string;
  title: string;
  description: string | null;
  schedule: string | null;
  recipients: string | null;
  lastRunAt: string | null;
  createdAt: string;
};

export default function ReportsScheduledPage() {
  const t = useTranslations('reports');
  const locale = useAppLocale();

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'scheduled'],
    queryFn: () => apiFetch<{ reports: Report[] }>('/api/reports?scheduled=1'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{t('scheduledTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('scheduledSubtitle')}</p>
        </div>
        <Link
          href="/reports/builder"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> {t('newReport')}
        </Link>
      </div>

      {isLoading || !data ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : data.reports.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
          <Calendar className="h-8 w-8 opacity-40" />
          <p>{t('scheduledEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.reports.map((r) => (
            <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[200px]">
                <h3 className="font-medium">{r.title}</h3>
                {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary-accent/30 bg-primary-accent/10 px-2 py-1 font-medium text-primary-accent">
                  <Calendar className="h-3 w-3" />
                  {r.schedule && t(`schedule${r.schedule.charAt(0).toUpperCase()}${r.schedule.slice(1)}` as 'scheduleWeekly')}
                </span>
                {r.recipients && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {r.recipients.split(',').length} {t('scheduledRecipientsCount')}
                  </span>
                )}
                {r.lastRunAt && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t('lastRun')} {formatDate(r.lastRunAt, locale)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
