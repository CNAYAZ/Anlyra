import { setRequestLocale } from 'next-intl/server';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { CreditsHydrator } from '@/components/dashboard/CreditsHydrator';
import { getCurrentOrganization } from '@/lib/session';
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

  // Read-only showcase surface: getCurrentOrganization uses the real signed-in
  // org, and falls back to the demo org (read-only) when there is no session,
  // so the public dashboard preview still renders. The plan now comes from the
  // real Organization record, never from a client cookie.
  const { id: orgId } = await getCurrentOrganization();

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
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-[1440px]">{children}</div>
          </main>
        </div>
        <CreditsHydrator credits={credits} max={planMax} />
      </div>
    </BillingProvider>
  );
}
