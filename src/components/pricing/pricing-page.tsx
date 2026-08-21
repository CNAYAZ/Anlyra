'use client';

import { useState } from 'react';
import { Check, ChevronDown, Shield } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type FaqItem = { q: string; a: string };

export type PricingPageProps = {
  heroTitle: string;
  heroSubtitle: string;
  toggleMonthly: string;
  toggleAnnual: string;
  discountBadge: string;
  // Pro
  proName: string;
  proTagline: string;
  proPriceMonthly: string;
  proPriceAnnual: string;
  proBilledMonthly: string;
  proBilledAnnual: string;
  proBilledNote: string;
  proFeatures: string[];
  proCta: string;
  proFooterNote: string;
  // Avanzato
  advancedBadge: string;
  advancedName: string;
  advancedTagline: string;
  advancedPriceMonthly: string;
  advancedPriceAnnual: string;
  advancedBilledMonthly: string;
  advancedBilledAnnual: string;
  advancedBilledNote: string;
  advancedFeaturesPrefix: string;
  advancedFeatures: string[];
  advancedCta: string;
  advancedFooterNote: string;
  // Enterprise
  enterpriseName: string;
  enterpriseTagline: string;
  enterpriseTaglineSub: string;
  enterprisePriceLabel: string;
  enterpriseFeaturesPrefix: string;
  enterpriseFeatures: string[];
  enterpriseCta: string;
  enterpriseFooterNote: string;
  // Money-back
  moneyBackTitle: string;
  moneyBackSubtitle: string;
  // Demo
  demoLabel: string;
  demoLink: string;
  // FAQ
  faqItems: FaqItem[];
  // Final CTA
  finalCtaTitle: string;
  finalCtaSubtitle: string;
  finalCtaPrimary: string;
};

export function PricingPage({
  heroTitle,
  heroSubtitle,
  toggleMonthly,
  toggleAnnual,
  discountBadge,
  proName,
  proTagline,
  proPriceMonthly,
  proPriceAnnual,
  proBilledMonthly,
  proBilledAnnual,
  proBilledNote,
  proFeatures,
  proCta,
  proFooterNote,
  advancedBadge,
  advancedName,
  advancedTagline,
  advancedPriceMonthly,
  advancedPriceAnnual,
  advancedBilledMonthly,
  advancedBilledAnnual,
  advancedBilledNote,
  advancedFeaturesPrefix,
  advancedFeatures,
  advancedCta,
  advancedFooterNote,
  enterpriseName,
  enterpriseTagline,
  enterpriseTaglineSub,
  enterprisePriceLabel,
  enterpriseFeaturesPrefix,
  enterpriseFeatures,
  enterpriseCta,
  enterpriseFooterNote,
  moneyBackTitle,
  moneyBackSubtitle,
  demoLabel,
  demoLink,
  faqItems,
  finalCtaTitle,
  finalCtaSubtitle,
  finalCtaPrimary,
}: PricingPageProps) {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const proPrice = annual ? proPriceAnnual : proPriceMonthly;
  const proBilled = annual ? proBilledAnnual : proBilledMonthly;
  const advancedPrice = annual ? advancedPriceAnnual : advancedPriceMonthly;
  const advancedBilled = annual ? advancedBilledAnnual : advancedBilledMonthly;

  return (
    <>
      <SiteHeader />
      <main className="bg-background">

        {/* ── Hero ── */}
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {heroTitle}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{heroSubtitle}</p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-card px-2 py-2">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                !annual
                  ? 'bg-primary-accent text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {toggleMonthly}
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                annual
                  ? 'bg-primary-accent text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {toggleAnnual}
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                {discountBadge}
              </span>
            </button>
          </div>
        </section>

        {/* ── 3 plan cards ── */}
        <section className="mx-auto max-w-6xl px-6 pb-12">
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Pro */}
            <div className="flex flex-col rounded-2xl border border-border bg-card p-8">
              <h2 className="font-heading text-2xl font-bold text-foreground">{proName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{proTagline}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-heading text-5xl font-bold tabular-nums text-foreground">
                  {proPrice}
                </span>
                <span className="text-sm text-muted-foreground">{proBilled}</span>
              </div>
              {annual && (
                <p className="mt-1 text-xs text-muted-foreground">{proBilledNote}</p>
              )}

              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {proFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button asChild variant="secondary" size="lg" className="w-full justify-center">
                  <Link href="/login?signup=pro">{proCta}</Link>
                </Button>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">{proFooterNote}</p>
            </div>

            {/* Avanzato — highlighted center card */}
            <div className="relative flex flex-col rounded-2xl border-2 border-primary-accent bg-card p-8 shadow-lg">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary-accent px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  {advancedBadge}
                </span>
              </div>

              <h2 className="font-heading text-2xl font-bold text-foreground">{advancedName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{advancedTagline}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-heading text-5xl font-bold tabular-nums text-foreground">
                  {advancedPrice}
                </span>
                <span className="text-sm text-muted-foreground">{advancedBilled}</span>
              </div>
              {annual && (
                <p className="mt-1 text-xs text-muted-foreground">{advancedBilledNote}</p>
              )}

              <ul className="mt-6 flex-1 space-y-3 text-sm">
                <li className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {advancedFeaturesPrefix}
                </li>
                {advancedFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button asChild variant="primary" size="lg" className="w-full justify-center">
                  <Link href="/login?signup=advanced">{advancedCta}</Link>
                </Button>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">{advancedFooterNote}</p>
            </div>

            {/* Enterprise */}
            <div className="flex flex-col rounded-2xl border border-border bg-muted p-8">
              <h2 className="font-heading text-2xl font-bold text-foreground">{enterpriseName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{enterpriseTagline}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{enterpriseTaglineSub}</p>

              <div className="mt-6">
                <span className="font-heading text-5xl font-bold text-foreground">
                  {enterprisePriceLabel}
                </span>
              </div>

              <ul className="mt-6 flex-1 space-y-3 text-sm">
                <li className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {enterpriseFeaturesPrefix}
                </li>
                {enterpriseFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-accent" aria-hidden />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button asChild variant="secondary" size="lg" className="w-full justify-center">
                  <a href="mailto:contact@anlyra.com?subject=Enterprise%20Inquiry%20%E2%80%94%20Anlyra">
                    {enterpriseCta}
                  </a>
                </Button>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">{enterpriseFooterNote}</p>
            </div>
          </div>
        </section>

        {/* ── Money-back guarantee ── */}
        <section className="mx-auto max-w-3xl px-6 pb-12">
          <div className="flex items-start gap-4 rounded-2xl border border-success/30 bg-success/5 p-6">
            <Shield className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
            <div>
              <h3 className="font-heading text-base font-semibold text-foreground">
                {moneyBackTitle}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {moneyBackSubtitle}
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mx-auto max-w-3xl px-6 pb-10">
          <h2 className="font-heading text-2xl font-semibold text-foreground">FAQ</h2>
          <div className="mt-6 divide-y divide-border rounded-xl border border-border">
            {faqItems.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-heading text-sm font-medium text-foreground">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                        isOpen && 'rotate-180',
                      )}
                      aria-hidden
                    />
                  </button>
                  {isOpen && (
                    <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Demo link (discreto) ── */}
        <section className="mx-auto max-w-3xl px-6 pb-16 text-center">
          <p className="text-sm text-muted-foreground">{demoLabel}</p>
          <a
            href="mailto:contact@anlyra.com?subject=Demo%20Request"
            className="mt-1 inline-flex items-center gap-1 text-sm text-primary-accent hover:underline"
            aria-label="Prenota una demo personalizzata"
          >
            {demoLink} →
          </a>
        </section>

        {/* ── Final CTA banner ── */}
        <section className="bg-muted">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <h2 className="font-heading text-3xl font-bold text-foreground">{finalCtaTitle}</h2>
            <p className="mt-3 text-muted-foreground">{finalCtaSubtitle}</p>
            <div className="mt-8">
              <Button asChild variant="primary" size="lg">
                <Link href="/login?signup=advanced">{finalCtaPrimary}</Link>
              </Button>
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
    </>
  );
}
