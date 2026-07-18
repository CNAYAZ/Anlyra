'use client';

export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import { AgentClient } from '@/components/ai-agent/AgentClient';

export default function AgentPage() {
  const t = useTranslations('agent');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* The strict <FeatureGate feature="ai_agent"> was removed for the test
          phase: all five modes are reachable by any signed-in user. Access stays
          protected server-side — /api/ai/analyze uses getAuthContext (401 for
          anonymous) and is rate-limited. */}
      <AgentClient />
    </div>
  );
}
