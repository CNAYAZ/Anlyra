'use client';

export const dynamic = 'force-dynamic';

import { Bot, Crown, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';

const PLAN = 'PRO'; // demo: TechFlow SRL plan
const REQUIRED_PLAN = 'ENTERPRISE';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Generazione automatica di report',
    desc: 'Ricevi un PDF settimanale o mensile con KPI, insight e suggerimenti senza muovere un dito.',
  },
  {
    icon: Zap,
    title: 'Aggiornamento forecast in tempo reale',
    desc: "L'agent ricalcola le previsioni quando arrivano nuovi dati e ti avvisa solo se cambiano in modo significativo.",
  },
  {
    icon: Bot,
    title: 'Summary giornaliero su email/Slack',
    desc: 'Un riassunto delle metriche più importanti, anomalie rilevate e azioni suggerite ogni mattina.',
  },
];

export default function AgentPage() {
  const hasAccess = PLAN === REQUIRED_PLAN;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Agent"
        subtitle="Agente autonomo che esegue azioni sui tuoi dati 24/7"
      />

      {!hasAccess && (
        <div className="overflow-hidden rounded-2xl border border-violet-300/60 bg-gradient-to-br from-violet-500/10 via-indigo-500/10 to-blue-500/10 p-6 dark:border-violet-700/40">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
              <Crown className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl font-semibold">Disponibile dal piano Enterprise</h2>
                <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Enterprise
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Stai usando il piano <strong>{PLAN}</strong>. L&apos;AI Agent richiede il piano Enterprise.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/settings/billing"
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                >
                  Passa a Enterprise
                </Link>
                <Link
                  href="/ai/chat"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Usa la Chat AI nel frattempo
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title}>
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Azioni pianificate" />
          <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
            <Bot className="mb-2 h-8 w-8 opacity-40" />
            Nessuna azione pianificata. Disponibile dal piano Enterprise.
          </div>
        </Card>

        <Card>
          <CardHeader title="Azioni eseguite" />
          <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
            <Bot className="mb-2 h-8 w-8 opacity-40" />
            Nessuna azione eseguita finora.
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500 dark:bg-slate-800"
          title="Disponibile dal piano Enterprise"
        >
          Configura agent
        </button>
      </div>
    </div>
  );
}
