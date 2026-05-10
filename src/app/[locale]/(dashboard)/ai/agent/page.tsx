'use client';

export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import { Bot, Sparkles, Zap, FileText } from 'lucide-react';
import { FeatureGate } from '@/components/billing/FeatureGate';

const AGENT_FEATURES = [
  { icon: FileText, key: 'featureReports' },
  { icon: Zap, key: 'featureForecast' },
  { icon: Bot, key: 'featureSummary' },
] as const;

function AgentContent() {
  const t = useTranslations('agent');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {AGENT_FEATURES.map(({ icon: Icon, key }) => (
          <div key={key} className="card flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-accent/10 text-primary-accent">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold">{t(`${key}Title` as Parameters<typeof t>[0])}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`${key}Desc` as Parameters<typeof t>[0])}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="mb-3 text-sm font-medium">{t('scheduledActions')}</p>
          <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
            <Bot className="mb-2 h-8 w-8 opacity-40" />
            {t('noScheduled')}
          </div>
        </div>

        <div className="card">
          <p className="mb-3 text-sm font-medium">{t('executedActions')}</p>
          <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
            <Sparkles className="mb-2 h-8 w-8 opacity-40" />
            {t('noExecuted')}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentPage() {
  const t = useTranslations('agent');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <FeatureGate feature="ai_agent">
        <AgentContent />
      </FeatureGate>
    </div>
  );
}
