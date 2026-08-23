'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, EyeOff, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/format';
import { apiFetch } from '@/lib/api/fetcher';
import { useCreditsStore } from '@/stores/credits-store';
import type {
  AlertDTO,
  AlertSeverity,
  AlertStatus,
  AlertAnalysisDTO,
  AnalyzeAlertResponse,
} from '@/types/ai';
import type { Locale } from '@/i18n/config';

type Props = {
  alert: AlertDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (id: string, status: AlertStatus) => void;
  pending: boolean;
};

const severityVariant: Record<AlertSeverity, 'danger' | 'warning' | 'info'> = {
  CRITICAL: 'danger',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
};

const ANALYSIS_CREDIT_COST = 1;

/** Map the raw API error string to a user-facing i18n key. */
function analyzeErrorKey(message: string): 'analyzeErrorCredits' | 'analyzeErrorConfig' | 'analyzeError' {
  if (message.includes('INSUFFICIENT_CREDITS')) return 'analyzeErrorCredits';
  if (message.includes('ANTHROPIC_API_KEY')) return 'analyzeErrorConfig';
  return 'analyzeError';
}

export function AlertDetail({ alert, open, onOpenChange, onUpdateStatus, pending }: Props) {
  const t = useTranslations('alerts');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const qc = useQueryClient();
  const credits = useCreditsStore((s) => s.credits);
  const setCredits = useCreditsStore((s) => s.setCredits);

  const [analysis, setAnalysis] = useState<AlertAnalysisDTO | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Reset local view whenever a different alert is opened, seeding from any
  // already-persisted analysis so it shows immediately without a new AI call.
  useEffect(() => {
    setAnalysis(alert?.aiAnalysis ?? null);
    setErrorKey(null);
  }, [alert?.id, alert?.aiAnalysis]);

  const analyzeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<AnalyzeAlertResponse>(`/api/ai/alerts/${id}/analyze`, { method: 'POST' }),
    onMutate: () => setErrorKey(null),
    onSuccess: (res) => {
      setAnalysis({ explanation: res.explanation, actions: res.actions });
      if (typeof res.creditsRemaining === 'number') setCredits(res.creditsRemaining);
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (err: Error) => setErrorKey(analyzeErrorKey(err.message)),
  });

  if (!alert) return null;

  const hasCredits = credits >= ANALYSIS_CREDIT_COST;
  const isAnalyzing = analyzeMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant={severityVariant[alert.severity as AlertSeverity]}>
              {t(`severity.${alert.severity}`)}
            </Badge>
            <Badge variant="neutral">
              {t(`status.${alert.status}`)}
            </Badge>
          </div>
          <DialogTitle className="text-xl mt-2">{alert.title}</DialogTitle>
          <DialogDescription>
            {t('createdAt')}: {formatDate(alert.createdAt, locale)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed">
          <p className="text-foreground">{alert.description}</p>

          <div className="rounded-md bg-muted/50 p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('recommendation')}
            </p>
            <p className="text-foreground">{alert.recommendation}</p>
          </div>

          {/* AI analysis section */}
          <div className="rounded-md border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('aiSectionTitle')}
              </p>
              {!analysis && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isAnalyzing || !hasCredits}
                  onClick={() => analyzeMutation.mutate(alert.id)}
                  title={!hasCredits ? t('analyzeErrorCredits') : undefined}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isAnalyzing ? t('analyzing') : t('analyzeButton')}
                </Button>
              )}
            </div>

            {isAnalyzing && !analysis && (
              <p className="text-xs text-muted-foreground">{t('analyzing')}</p>
            )}

            {errorKey && (
              <div className="space-y-1 text-xs text-danger">
                <p>{t(errorKey)}</p>
                {errorKey === 'analyzeErrorCredits' && (
                  <Link href="/settings/billing" className="inline-block font-medium underline-offset-4 hover:underline">
                    {tCommon('upgrade')}
                  </Link>
                )}
              </div>
            )}

            {!analysis && !isAnalyzing && !errorKey && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>{hasCredits ? t('aiEmpty') : t('analyzeErrorCredits')}</p>
                {!hasCredits && (
                  <Link
                    href="/settings/billing"
                    className="inline-block font-medium text-sage-700 underline-offset-4 hover:underline dark:text-sage-300"
                  >
                    {tCommon('upgrade')}
                  </Link>
                )}
              </div>
            )}

            {analysis && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">{t('aiExplanation')}</p>
                  <p className="text-foreground">{analysis.explanation}</p>
                </div>
                {analysis.actions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">{t('aiActions')}</p>
                    <ul className="list-disc space-y-1 pl-5 text-foreground">
                      {analysis.actions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                  {t('aiGeneratedCaption')}
                </p>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            <span className="font-medium">{t('source')}:</span> {alert.source}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || alert.status === 'DISMISSED'}
            onClick={() => onUpdateStatus(alert.id, 'DISMISSED')}
          >
            <EyeOff className="h-4 w-4" />
            {t('markDismissed')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending || alert.status === 'READ'}
            onClick={() => onUpdateStatus(alert.id, 'READ')}
          >
            <Check className="h-4 w-4" />
            {t('markRead')}
          </Button>
          <Button
            size="sm"
            disabled={pending || alert.status === 'RESOLVED'}
            onClick={() => onUpdateStatus(alert.id, 'RESOLVED')}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t('markResolved')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
