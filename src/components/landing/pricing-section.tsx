import { useTranslations } from 'next-intl';
import { PricingTable } from '@/components/pricing-table';

export function PricingSection() {
  const t = useTranslations('landing.pricing');
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl text-balance">
            {t('title')}
          </h2>
          <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <PricingTable />
      </div>
    </section>
  );
}
