'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, Lock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useReportsStore } from '@/lib/reports/store';
import { hasFeature, type Plan } from '@/lib/plans';
import type { GeneratedReport } from '@/lib/reports/types';

export function ShareModal({
  report,
  open,
  onClose,
  plan,
  locale,
}: {
  report: GeneratedReport | null;
  open: boolean;
  onClose: () => void;
  plan: Plan;
  locale: string;
}) {
  const t = useTranslations('reports.share');
  const tCommon = useTranslations('common');
  const setShareEnabled = useReportsStore((s) => s.setShareEnabled);
  const [copied, setCopied] = useState(false);

  if (!report) return null;

  const canShare = hasFeature(plan, 'publicSharing');
  const shareUrl =
    typeof window !== 'undefined' && report.shareToken
      ? `${window.location.origin}/${locale}/share/${report.shareToken}`
      : '';

  const onToggle = () => {
    if (!canShare) return;
    setShareEnabled(report.id, !report.shareEnabled);
  };

  const onCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title={t('title')}>
      {!canShare ? (
        <div className="flex items-start gap-3 rounded-lg bg-warning/10 border border-warning p-4">
          <Lock className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">{t('proOnly')}</p>
            <button className="mt-2 text-sm font-medium text-warning hover:underline">
              {tCommon('upgrade')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t('publicLink')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('publicLinkDesc')}</p>
            </div>
            <button
              onClick={onToggle}
              role="switch"
              aria-checked={report.shareEnabled}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                report.shareEnabled ? 'bg-primary-accent' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${
                  report.shareEnabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
          {report.shareEnabled && shareUrl && (
            <div className="flex items-center gap-2">
              <input readOnly value={shareUrl} className="input font-mono text-xs" />
              <button onClick={onCopy} className="btn-secondary shrink-0">
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    {t('copy')}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
