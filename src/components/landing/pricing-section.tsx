import { useTranslations } from 'next-intl';
import { PricingTable } from '@/components/pricing-table';

export function PricingSection() {
  const t = useTranslations('landing.pricing');
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold text-slate-900 md:text-4xl text-balance">
            {t('title')}
          </h2>
          <p className="mt-3 text-slate-600">{t('subtitle')}</p>
        </div>
        <PricingTable />
      </div>
    </section>
  );
}
