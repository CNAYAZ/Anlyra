import { setRequestLocale } from 'next-intl/server';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { CreditsHydrator } from '@/components/dashboard/CreditsHydrator';
import { getCurrentOrganization } from '@/lib/session';
import { getCreditBalance } from '@/lib/billing/repository';
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
  const { id: orgId, plan } = await getCurrentOrganization();
  const planId = (plan?.toUpperCase() ?? 'PRO') as PlanId;

  const planMax = PLANS[planId]?.limits.aiCredits ?? PLANS['PRO'].limits.aiCredits;
  const credits = await getCreditBalance(orgId);

  return (
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
  );
}
