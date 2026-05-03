'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FeatureGate } from '@/components/feature-gate';
import { Activity, Brain, Sparkles, Zap } from 'lucide-react';

export function AiAgentView() {
  const t = useTranslations('aiAgent');

  return (
    <FeatureGate required="ENTERPRISE">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  {t('title')}
                </CardTitle>
                <CardDescription>{t('subtitle')}</CardDescription>
              </div>
              <Badge variant="success">
                <Activity className="mr-1 h-3 w-3" />
                {t('active')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{t('description')}</p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard icon={Activity} titleKey="monitor" />
          <FeatureCard icon={Zap} titleKey="actions" />
          <FeatureCard icon={Brain} titleKey="memory" />
        </div>
      </div>
    </FeatureGate>
  );
}

function FeatureCard({
  icon: Icon,
  titleKey
}: {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: 'monitor' | 'actions' | 'memory';
}) {
  const t = useTranslations('aiAgent.features');
  return (
    <Card>
      <CardContent className="pt-5">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="mt-3 font-heading text-base font-semibold text-slate-900">
          {t(`${titleKey}.title`)}
        </h3>
        <p className="mt-1 text-sm text-slate-500">{t(`${titleKey}.description`)}</p>
      </CardContent>
    </Card>
  );
}
