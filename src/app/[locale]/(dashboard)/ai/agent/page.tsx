'use client';

export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import { Bot } from 'lucide-react';
import { AgentClient } from '@/components/ai-agent/AgentClient';

export default function AgentPage() {
  const t = useTranslations('agent');

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sage-50 text-sage-600 dark:bg-sage-700/30 dark:text-sage-300">
          <Bot className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-0.5">
          <h1 className="font-heading text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm text-fg-2">{t('subtitle')}</p>
        </div>
      </div>

      {/* The strict <FeatureGate feature="ai_agent"> was removed for the test
          phase: all five modes are reachable by any signed-in user. Access stays
          protected server-side — /api/ai/analyze uses getAuthContext (401 for
          anonymous) and is rate-limited. */}
      <AgentClient />
    </div>
  );
}
