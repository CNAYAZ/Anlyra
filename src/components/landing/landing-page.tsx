'use client';

import {
  BarChart3,
  Bell,
  Check,
  EyeOff,
  FileText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type TestimonialItem = { initials: string; name: string; role: string; quote: string };
export type HowItWorksStep = { number: string; title: string; desc: string };
export type FeatureItem = { title: string; desc: string };
export type ProblemPoint = { title: string; desc: string };

export type LandingPageProps = {
  heroTitle: string;
  heroSubtitle: string;
  heroCta1: string;
  heroCta2: string;
  heroDisclaimer: string;
  heroPreviewCaption: string;
  problemTitle: string;
  problemPoints: ProblemPoint[];
  featuresTitle: string;
  featureItems: FeatureItem[];
  howItWorksTitle: string;
  howItWorksSteps: HowItWorksStep[];
  trustTitle: string;
  trustParagraph: string;
  trustPromises: string[];
  testimonialsTitle: string;
  testimonialItems: TestimonialItem[];
  finalCtaTitle: string;
  finalCtaSubtitle: string;
  finalCtaPrimary: string;
  finalCtaSecondary: string;
};

const PROBLEM_ICONS = [EyeOff, Zap, ShieldCheck];
const FEATURE_ICONS = [BarChart3, Sparkles, Bell, TrendingUp, Users, FileText];

export function LandingPage({
  heroTitle,
  heroSubtitle,
  heroCta1,
  heroCta2,
  heroDisclaimer,
  heroPreviewCaption,
  problemTitle,
  problemPoints,
  featuresTitle,
  featureItems,
  howItWorksTitle,
  howItWorksSteps,
  trustTitle,
  trustParagraph,
  trustPromises,
  testimonialsTitle,
  testimonialItems,
  finalCtaTitle,
  finalCtaSubtitle,
  finalCtaPrimary,
  finalCtaSecondary,
}: LandingPageProps) {
  return (
    <>
      <SiteHeader />
      <main className="bg-background">

        {/* ── HERO ── */}
        <section className="bg-gradient-to-b from-background to-muted/30">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center md:py-28">
            <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
              {heroTitle}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {heroSubtitle}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild variant="primary" size="lg">
                <Link href="/login?signup=pro">{heroCta1}</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/pricing">{heroCta2}</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">{heroDisclaimer}</p>

            {/* Hero illustration placeholder */}
            <div className="mx-auto mt-14 flex max-w-2xl items-center justify-center rounded-2xl border border-border bg-muted/50 py-20">
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="h-14 w-14 text-primary-accent opacity-40" />
                <span className="text-sm text-muted-foreground opacity-60">
                  {heroPreviewCaption}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── PROBLEMA / SOLUZIONE ── */}
        <section className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="font-heading text-3xl font-bold text-foreground">{problemTitle}</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {problemPoints.map((p, i) => {
              const Icon = PROBLEM_ICONS[i];
              return (
                <div key={i} className="flex flex-col gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-accent/10">
                    <Icon className="h-5 w-5 text-primary-accent" aria-hidden />
                  </span>
                  <h3 className="font-heading text-base font-semibold text-foreground">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FEATURE GRID ── */}
        <section className="bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-center font-heading text-3xl font-bold text-foreground">
              {featuresTitle}
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {featureItems.map((f, i) => {
                const Icon = FEATURE_ICONS[i];
                return (
                  <div
                    key={i}
                    className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-accent/10">
                      <Icon className="h-5 w-5 text-primary-accent" aria-hidden />
                    </span>
                    <h3 className="font-heading text-base font-semibold text-foreground">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── COME FUNZIONA ── */}
        <section className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-center font-heading text-3xl font-bold text-foreground">
            {howItWorksTitle}
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {howItWorksSteps.map((s, i) => (
              <div key={i} className="relative flex flex-col items-center gap-4 text-center">
                {/* connector */}
                {i < howItWorksSteps.length - 1 && (
                  <div
                    aria-hidden
                    className="absolute left-[calc(50%+2.5rem)] top-6 hidden w-[calc(100%-5rem)] border-t border-dashed border-border md:block"
                  />
                )}
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary-accent bg-background font-heading text-lg font-bold text-primary-accent">
                  {s.number}
                </span>
                <h3 className="font-heading text-base font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TRUST / PRIVACY ── */}
        <section className="bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="font-heading text-3xl font-bold text-foreground">{trustTitle}</h2>
                <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{trustParagraph}</p>
              </div>
              <ul className="space-y-4">
                {trustPromises.map((promise, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
                    <span className="text-sm text-foreground">{promise}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS (placeholder) ── */}
        {/* Testimonial placeholder. Sostituire con feedback reali quando disponibili. */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center font-heading text-3xl font-bold text-foreground">
            {testimonialsTitle}
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonialItems.map((t, i) => (
              <figure
                key={i}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
              >
                <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      'bg-primary-accent/10 font-heading text-xs font-bold text-primary-accent',
                    )}
                  >
                    {t.initials}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="bg-muted/50">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center">
            <h2 className="font-heading text-4xl font-bold text-foreground">{finalCtaTitle}</h2>
            <p className="mt-4 text-muted-foreground">{finalCtaSubtitle}</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild variant="primary" size="lg">
                <Link href="/login?signup=pro">{finalCtaPrimary}</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a href="mailto:hello@anlyra.com">{finalCtaSecondary}</a>
              </Button>
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
    </>
  );
}
