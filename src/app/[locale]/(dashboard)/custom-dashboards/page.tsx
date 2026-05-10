'use client';

export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Plus, Trash2 } from 'lucide-react';
import { useAppLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/utils';
import { apiFetch } from '@/lib/api/fetcher';
import { Skeleton } from '@/components/ui/skeleton';

type Dashboard = {
  id: string;
  name: string;
  description: string | null;
  widgets: { id: string; type: string; title: string }[];
  createdAt: string;
  updatedAt: string;
};

export default function CustomDashboardsPage() {
  const t = useTranslations('customDashboards');
  const qc = useQueryClient();
  const locale = useAppLocale();

  const { data, isLoading } = useQuery({
    queryKey: ['custom-dashboards'],
    queryFn: () => apiFetch<{ dashboards: Dashboard[] }>('/api/custom-dashboards'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/custom-dashboards/${id}`, { method: 'DELETE' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['custom-dashboards'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Link
          href="/custom-dashboards/builder"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> {t('newDashboard')}
        </Link>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : data.dashboards.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
          <LayoutDashboard className="h-8 w-8 opacity-40" />
          <p>{t('empty')}</p>
          <Link
            href="/custom-dashboards/builder"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            <Plus className="h-3 w-3" /> {t('newDashboard')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.dashboards.map((d) => (
            <div key={d.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-heading text-base font-semibold">{d.name}</h3>
                  {d.description && <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(d.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  title={t('delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {d.widgets.length} {t('widgets')} · {t('updated')} {formatDate(d.updatedAt, locale)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {d.widgets.slice(0, 5).map((w) => (
                  <span key={w.id} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {w.type.replace(/_/g, ' ')}
                  </span>
                ))}
                {d.widgets.length > 5 && (
                  <span className="text-[10px] text-muted-foreground">+{d.widgets.length - 5}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
