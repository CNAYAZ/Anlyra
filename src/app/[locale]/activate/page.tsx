import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getAuthContext, getSessionState, DELETION_PENDING_PATH } from '@/lib/session';
import { needsActivation } from '@/lib/billing/activation';
import { getBillingState } from '@/lib/billing/repository';
import { BillingProvider } from '@/lib/billing/context';
import { isOwnerRole } from '@/lib/auth/require-role';
import { prisma } from '@/lib/prisma';
import PrivacyPanel from '../(dashboard)/settings/security/PrivacyPanel';
import { ActivateClient } from './ActivateClient';

// Per-user and read fresh on every visit: whether the company still needs a
// card must never come from a cached render.
export const dynamic = 'force-dynamic';

/**
 * The ONE page a company that has never entered a card may open (founder's
 * decision, 2026-10-03: no card, no access to the product). Every dashboard
 * page sends it here (src/app/[locale]/(dashboard)/layout.tsx). It offers:
 *  • the plan, the box with the rule and the card (owner only — billing is
 *    owner-only); the other members are told the owner must do it;
 *  • data export and account deletion, always available (GDPR), through the
 *    same panel as Settings → Security.
 * Stripe brings the customer back here (?success=1 / ?canceled=1) until the
 * webhook has landed; then the page leads to the dashboard.
 */
export default async function ActivatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;

  const state = await getSessionState();
  if (state.status === 'anonymous') redirect(`/${locale}/login`);
  if (state.status === 'no-org') redirect(`/${locale}/onboarding`);
  if (state.status === 'deletion-pending') redirect(`/${locale}${DELETION_PENDING_PATH}`);

  const ctx = await getAuthContext();
  if (!ctx) redirect(`/${locale}/login`);
  const back = query.success === '1' || query.canceled === '1';
  const activating = await needsActivation(ctx.organizationId);
  if (!activating && !back) redirect(`/${locale}/overview`);

  const [billingState, org] = await Promise.all([
    getBillingState(ctx.organizationId),
    prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { name: true } }),
  ]);
  const t = await getTranslations('activate');

  return (
    <BillingProvider initialState={billingState}>
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-8">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">{t('title')}</h1>
            <p className="mt-1 text-sm text-fg-2">{t('intro', { company: org?.name ?? '' })}</p>
          </div>
          <ActivateClient isOwner={isOwnerRole(ctx.role)} activated={!activating} />
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-semibold text-foreground">{t('privacyTitle')}</h2>
            <p className="text-sm text-fg-2">{t('privacyIntro')}</p>
            <PrivacyPanel />
          </section>
        </div>
      </main>
    </BillingProvider>
  );
}
