'use client';

export const dynamic = 'force-dynamic';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardWidget } from '@/components/dashboards/DashboardWidget';
import type { WidgetConfig } from '@/lib/dashboard-widgets';

/**
 * Views one saved dashboard, drawing every widget with the organization's real
 * data.
 *
 * ── WHAT THIS REPLACES ──
 * The previous page at this URL read from localStorage while the builder saved
 * to the DATABASE, so it never found anything a user had actually created — it
 * showed "dashboard not found" for every real dashboard, and synthetic numbers
 * for the localStorage-only ones. It also lived OUTSIDE the (dashboard) route
 * group, so it rendered without the sidebar, the topbar or the demo banner.
 * Moving it inside the group fixes all of that in one step.
 */

type DashboardPayload = {
  dashboard: {
    id: string;
    name: string;
    description: string | null;
    widgets: WidgetConfig[];
    createdAt: string;
    updatedAt: string;
  };
};

export default function DashboardViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('customDashboards');
  const locale = useAppLocale();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['custom-dashboard', id],
    queryFn: () => apiFetch<DashboardPayload>(`/api/custom-dashboards/${id}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
        <LayoutDashboard className="h-8 w-8 opacity-40" />
        <p>{t('notFound')}</p>
        <Link href="/custom-dashboards" className="text-primary-accent hover:underline">
          {t('back')}
        </Link>
      </div>
    );
  }

  const d = data.dashboard;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            href="/custom-dashboards"
            className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t('back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-semibold">{d.name}</h1>
            {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
            <p className="text-xs text-muted-foreground">
              {t('updated')} {formatDate(d.updatedAt, locale)}
            </p>
          </div>
        </div>
      </div>

      {d.widgets.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
          <LayoutDashboard className="h-8 w-8 opacity-40" />
          <p>{t('emptyDashboard')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {d.widgets.map((w) => (
            // Charts need more room than a single number, so they take two
            // columns where the grid has them.
            <div
              key={w.id}
              className={w.type.startsWith('chart_') || w.type === 'forecast' ? 'md:col-span-2' : ''}
            >
              <DashboardWidget widget={w} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
