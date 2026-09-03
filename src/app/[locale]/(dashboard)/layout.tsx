import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { CreditsHydrator } from '@/components/dashboard/CreditsHydrator';
import { TrialExpiredBanner } from '@/components/billing/TrialExpiredBanner';
import {
  getCurrentOrganization,
  getSessionState,
  hasDemoSession,
  isDemoOrganization,
} from '@/lib/session';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { DemoProvider } from '@/lib/demo/context';
import { getCreditBalance, getBillingState } from '@/lib/billing/repository';
import { BillingProvider } from '@/lib/billing/context';
import { PLANS } from '@/lib/billing/plans';
import type { PlanId } from '@/lib/billing/plans';

// Authenticated per-user surface: never statically prerendered. The previous
// getSession() bailed to dynamic implicitly via a synchronous cookie read; now
// that the layout resolves the org from the real session, we opt the whole
// dashboard segment into on-demand rendering explicitly.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // A signed-in user without an organization must go through onboarding — never
  // fall through to the demo org (that leaked another tenant's data). Onboarding
  // lives outside this (dashboard) segment, so the redirect cannot loop.
  const state = await getSessionState();
  if (state.status === 'no-org') {
    redirect(`/${locale}/onboarding`);
  }

  // An anonymous visitor is sent to the login page unless they explicitly
  // started a demo. Previously this same branch silently served the demo
  // organization's invented data to anyone who happened to open a dashboard
  // URL; the demo is now something you choose, not something you land in.
  const inDemo = await hasDemoSession();
  if (state.status === 'anonymous' && !inDemo) {
    redirect(`/${locale}/login`);
  }

  // 'ok' → the real signed-in org; anonymous WITH the demo cookie → the demo org.
  // The plan comes from the real Organization record, never from a client cookie.
  const { id: orgId } = await getCurrentOrganization();

  // Read-only applies to the demo organization however it was reached: an
  // anonymous demo visit, or someone signed in as the demo account.
  const isDemo = isDemoOrganization(orgId);

  // Real subscription state from the DB (BillingSubscription via repository).
  // getBillingState returns the org's actual plan/status/period — falling back to
  // the repository default only for an org that never had a subscription row. The
  // client BillingProvider is fed this real state so useBilling()/usePlan() stop
  // returning the hardcoded DEFAULT_BILLING ("PRO") everywhere in the dashboard.
  const billingState = await getBillingState(orgId);
  const planId = billingState.plan as PlanId;

  const planMax = PLANS[planId]?.limits.aiCredits ?? PLANS['PRO'].limits.aiCredits;
  const credits = await getCreditBalance(orgId);

  return (
    <BillingProvider initialState={billingState}>
      {/* Makes `isDemo` available to every client component below, so the UI can
          disable the controls that the server would refuse anyway. */}
      <DemoProvider isDemo={isDemo}>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            {/* Demo notice first: it explains what the whole page is. Like the
                trial strip it pushes content down instead of covering it. */}
            <DemoBanner />
            {/* Read-only strip for expired trials (renders null for active/trialing).
                A strip that pushes content down, never an overlay — data stays visible. */}
            <TrialExpiredBanner />
            <main className="flex-1 p-6">
              <div className="mx-auto w-full max-w-[1440px]">{children}</div>
            </main>
          </div>
          <CreditsHydrator credits={credits} max={planMax} />
        </div>
      </DemoProvider>
    </BillingProvider>
  );
}
