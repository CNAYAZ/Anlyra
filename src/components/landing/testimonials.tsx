'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Quote } from 'lucide-react';

const ITEMS = [0, 1, 2] as const;

export function Testimonials() {
  const t = useTranslations('landing.testimonials');
  return (
    <section id="testimonials" className="bg-white py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold text-slate-900 md:text-4xl text-balance">
            {t('title')}
          </h2>
          <p className="mt-3 text-slate-600">{t('subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {ITEMS.map((i, idx) => {
            const initials = t(`items.${i}.name`)
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2);
            return (
              <motion.figure
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="rounded-lg border border-slate-200 bg-[#f8fafc] p-6"
              >
                <Quote className="h-6 w-6 text-primary-accent/40" />
                <blockquote className="mt-3 text-sm text-slate-700">
                  “{t(`items.${i}.quote`)}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-medium text-white">
                    {initials}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-slate-900">
                      {t(`items.${i}.name`)}
                    </span>
                    <span className="block text-xs text-slate-500">{t(`items.${i}.role`)}</span>
                  </span>
                </figcaption>
              </motion.figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
