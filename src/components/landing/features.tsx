'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  Wallet,
  TrendingUp,
  Settings2,
  Sparkles,
  FileText,
  LayoutDashboard,
  type LucideIcon
} from 'lucide-react';

const items: { id: string; icon: LucideIcon; tone: string }[] = [
  { id: 'finance', icon: Wallet, tone: 'text-success bg-success/10' },
  { id: 'market', icon: TrendingUp, tone: 'text-primary-accent bg-primary-accent/10' },
  { id: 'operations', icon: Settings2, tone: 'text-warning bg-warning/10' },
  { id: 'ai', icon: Sparkles, tone: 'text-accent bg-accent/10' },
  { id: 'reports', icon: FileText, tone: 'text-primary bg-primary/10' },
  { id: 'dashboard', icon: LayoutDashboard, tone: 'text-danger bg-danger/10' }
];

export function Features() {
  const t = useTranslations('landing.features');
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold text-slate-900 md:text-4xl text-balance">
            {t('title')}
          </h2>
          <p className="mt-3 text-slate-600">{t('subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it, idx) => {
            const Icon = it.icon;
            return (
              <motion.div
                key={it.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-card transition-shadow hover:shadow-md"
              >
                <span className={`grid h-10 w-10 place-items-center rounded-md ${it.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-heading text-lg font-semibold text-slate-900">
                  {t(`items.${it.id}.title`)}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{t(`items.${it.id}.description`)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
