'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, LayoutDashboard, Pencil, Eye, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDashboardsStore } from '@/lib/store/dashboards';
import { usePlanStore } from '@/lib/store/plan';
import { dashboardLimit } from '@/lib/plan';
import { formatDate } from '@/lib/utils';

export function DashboardsList() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const dashboards = useDashboardsStore((s) => s.dashboards);
  const hasHydrated = useDashboardsStore((s) => s.hasHydrated);
  const createDashboard = useDashboardsStore((s) => s.createDashboard);
  const deleteDashboard = useDashboardsStore((s) => s.deleteDashboard);
  const plan = usePlanStore((s) => s.plan);
  const limit = dashboardLimit(plan);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  const canCreate = dashboards.length < limit;
  const gateMessage =
    plan === 'starter' || plan === 'free'
      ? t('dashboards.limits.starter')
      : !canCreate && plan === 'pro'
        ? t('dashboards.limits.pro')
        : null;

  const handleCreate = () => {
    if (!canCreate) return;
    const d = createDashboard(t('common.untitled'));
    router.push(`/custom-dashboards/builder?id=${d.id}`);
  };

  const target = dashboards.find((d) => d.id === pendingDelete);

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">{t('dashboards.title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('dashboards.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {Number.isFinite(limit) && (
            <Badge variant="neutral">
              {dashboards.length} / {limit}
            </Badge>
          )}
          <Button onClick={handleCreate} disabled={!canCreate}>
            <Plus className="h-4 w-4" />
            {t('dashboards.new')}
          </Button>
        </div>
      </div>

      {gateMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-card border border-warning/30 bg-warning/5 p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="text-sm text-bg-dark">{gateMessage}</p>
          </div>
          <button
            type="button"
            className="rounded-md border border-warning/40 bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-warning/10"
          >
            {t('dashboards.limits.upgrade')}
          </button>
        </div>
      )}

      {!hasHydrated ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : dashboards.length === 0 ? (
        <EmptyState message={t('dashboards.empty.title')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((d) => (
            <Card key={d.id} className="flex flex-col gap-3">
              <div>
                <CardTitle className="truncate">{d.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('dashboards.updatedAt')} {formatDate(d.updatedAt, locale)}
                </p>
              </div>
              <Badge variant="info" className="w-max">
                {t('dashboards.widgets', { count: d.widgets.length })}
              </Badge>
              <div className="mt-auto flex items-center gap-2 pt-2">
                <Link
                  href={`/custom-dashboards/${d.id}`}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-lg bg-primary-accent px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
                >
                  <Eye className="h-4 w-4" />
                  {t('common.open')}
                </Link>
                <Link
                  href={`/custom-dashboards/builder?id=${d.id}`}
                  className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Pencil className="h-4 w-4" />
                  {t('common.edit')}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingDelete(d.id)}
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground">
            {target ? t('dashboards.deleteConfirm', { name: target.name }) : ''}
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingDelete) deleteDashboard(pendingDelete);
                setPendingDelete(null);
              }}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
