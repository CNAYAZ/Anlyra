'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowRight, PlayCircle, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export function Hero() {
  const t = useTranslations('landing.hero');
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-card via-card to-muted">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(59,130,246,0.15),rgba(255,255,255,0))]" />
      <div className="container py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-accent/20 bg-primary-accent/5 px-3 py-1 text-xs font-medium text-primary-accent">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-accent" />
            {t('badge')}
          </span>
          <h1 className="mt-5 font-heading text-4xl font-bold tracking-tight text-foreground text-balance md:text-6xl">
            {t('title')}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground text-balance md:text-xl">{t('subtitle')}</p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/onboarding">
                {t('ctaPrimary')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="#how">
                <PlayCircle className="mr-2 h-4 w-4" />
                {t('ctaSecondary')}
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t('trust')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-16 max-w-5xl"
        >
          <DashboardPreview />
        </motion.div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-2xl border bg-card p-3 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.25)]">
      <div className="flex items-center gap-1.5 px-2 pb-2">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
      </div>
      <div className="grid gap-3 rounded-xl bg-[#0f172a] p-4 md:grid-cols-3">
        <KpiCard label="MRR" value="€48.230" trend="+12.4%" tone="up" />
        <KpiCard label="Customers" value="1.284" trend="+5.1%" tone="up" />
        <KpiCard label="Churn" value="3.2%" trend="-0.4 pts" tone="up" />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <ChartCard
          title="Revenue trend"
          icon={<TrendingUp className="h-4 w-4 text-accent" />}
        />
        <ChartCard
          title="Conversion funnel"
          icon={<BarChart3 className="h-4 w-4 text-primary-accent" />}
        />
        <InsightCard />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  trend,
  tone
}: {
  label: string;
  value: string;
  trend: string;
  tone: 'up' | 'down';
}) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-card-foreground">{value}</p>
      <p className={`mt-1 text-xs ${tone === 'up' ? 'text-success' : 'text-danger'}`}>{trend}</p>
    </div>
  );
}

function ChartCard({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {icon}
      </div>
      <div className="mt-3 flex h-24 items-end gap-1">
        {[40, 60, 35, 70, 55, 80, 65, 90, 75, 95].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-primary-accent/30 to-primary-accent"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function InsightCard() {
  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">AI Insight</p>
      <p className="mt-2 text-sm text-foreground">
        Conversion drops 18% on weekends. Consider running a weekend-only promo to recover.
      </p>
      <button className="mt-3 text-xs font-medium text-accent hover:underline">View details →</button>
    </div>
  );
}
