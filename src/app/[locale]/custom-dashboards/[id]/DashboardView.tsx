'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Skeleton, EmptyState } from '@/components/ui/state';
import { useDashboardsStore } from '@/lib/store/dashboards';
import { formatDate } from '@/lib/utils';

const ReadOnlyGrid = dynamic(() => import('./ReadOnlyGrid'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-3 gap-4 p-6">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  ),
});

export function DashboardView({ id }: { id: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const hasHydrated = useDashboardsStore((s) => s.hasHydrated);
  const dashboards = useDashboardsStore((s) => s.dashboards);
  const dashboard = dashboards.find((d) => d.id === id);

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-screen-2xl px-6 py-8">
        <Skeleton className="mb-4 h-8 w-72" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="mx-auto max-w-screen-2xl px-6 py-12">
        <EmptyState
          title={t('view.notFound')}
          description={t('view.notFoundDescription')}
          action={
            <Link
              href="/custom-dashboards"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary-accent px-4 text-sm font-medium text-white hover:bg-primary-hover"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('view.back')}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/custom-dashboards"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-bg-dark"
            aria-label={t('nav.back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-semibold text-bg-dark">{dashboard.name}</h1>
            <p className="text-xs text-slate-500">
              {t('dashboards.updatedAt')} {formatDate(dashboard.updatedAt, locale)}
            </p>
          </div>
        </div>
        <Link
          href={`/custom-dashboards/builder?id=${dashboard.id}`}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-bg-dark hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4" />
          {t('common.edit')}
        </Link>
      </div>
      <div className="flex-1 overflow-auto bg-bg-light scrollbar-thin">
        {dashboard.widgets.length === 0 ? (
          <div className="p-12">
            <EmptyState title={t('builder.canvasEmpty')} />
          </div>
        ) : (
          <ReadOnlyGrid widgets={dashboard.widgets} />
        )}
      </div>
    </div>
  );
}
