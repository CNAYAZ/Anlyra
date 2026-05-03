'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Cycle = 'monthly' | 'yearly';

type Plan = {
  id: 'starter' | 'pro' | 'enterprise';
  monthly: number;
  yearly: number;
  popular?: boolean;
  features: { key: string; values?: Record<string, number | string> }[];
};

const PLANS: Plan[] = [
  {
    id: 'starter',
    monthly: 29,
    yearly: 23,
    features: [
      { key: 'users', values: { count: 1 } },
      { key: 'orgs', values: { count: 1 } },
      { key: 'imports', values: { count: 5 } },
      { key: 'credits', values: { count: 5 } },
      { key: 'financeBasic' }
    ]
  },
  {
    id: 'pro',
    monthly: 79,
    yearly: 63,
    popular: true,
    features: [
      { key: 'users', values: { count: 10 } },
      { key: 'orgs', values: { count: 5 } },
      { key: 'unlimitedImports' },
      { key: 'credits', values: { count: 100 } },
      { key: 'allModules' },
      { key: 'support' }
    ]
  },
  {
    id: 'enterprise',
    monthly: 199,
    yearly: 159,
    features: [
      { key: 'unlimitedUsers' },
      { key: 'unlimitedOrgs' },
      { key: 'unlimitedImports' },
      { key: 'credits', values: { count: 500 } },
      { key: 'aiAgent' },
      { key: 'realtime' },
      { key: 'audit' }
    ]
  }
];

export function PricingTable() {
  const t = useTranslations('landing.pricing');
  const [cycle, setCycle] = useState<Cycle>('monthly');

  return (
    <div>
      <div className="mt-8 flex items-center justify-center gap-2">
        <CycleButton active={cycle === 'monthly'} onClick={() => setCycle('monthly')}>
          {t('monthly')}
        </CycleButton>
        <CycleButton active={cycle === 'yearly'} onClick={() => setCycle('yearly')}>
          {t('yearly')}
          <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
            {t('yearlyDiscount')}
          </span>
        </CycleButton>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan, idx) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
            className={cn(
              'relative flex flex-col rounded-lg border bg-white p-6 shadow-card',
              plan.popular ? 'border-primary-accent ring-1 ring-primary-accent' : 'border-slate-200'
            )}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-accent px-3 py-1 text-xs font-medium text-white">
                {t('popular')}
              </span>
            )}
            <h3 className="font-heading text-xl font-semibold text-slate-900">
              {t(`${plan.id}.name`)}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{t(`${plan.id}.description`)}</p>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-bold text-slate-900">
                €{cycle === 'monthly' ? plan.monthly : plan.yearly}
              </span>
              <span className="text-sm text-slate-500">{t('perMonth')}</span>
            </div>

            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((f) => (
                <li key={f.key} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{t(`features.${f.key}`, f.values as never)}</span>
                </li>
              ))}
            </ul>

            <Button
              asChild
              className="mt-6"
              variant={plan.popular ? 'default' : 'outline'}
            >
              <Link href="/onboarding">{t(`${plan.id}.cta`)}</Link>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CycleButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      )}
    >
      {children}
    </button>
  );
}
