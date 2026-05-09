'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Upload, Brain, Rocket } from 'lucide-react';

const steps = [
  { id: 'upload', icon: Upload },
  { id: 'analyze', icon: Brain },
  { id: 'decide', icon: Rocket }
];

export function HowItWorks() {
  const t = useTranslations('landing.howItWorks');
  return (
    <section id="how" className="bg-card py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl text-balance">
            {t('title')}
          </h2>
          <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="relative rounded-lg border bg-muted p-6"
              >
                <span className="absolute right-4 top-4 font-mono text-xs font-medium text-muted-foreground">
                  0{idx + 1}
                </span>
                <span className="grid h-12 w-12 place-items-center rounded-md bg-primary text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">
                  {t(`steps.${s.id}.title`)}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`steps.${s.id}.description`)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
