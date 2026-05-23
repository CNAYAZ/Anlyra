import { setRequestLocale } from 'next-intl/server';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { CreditsHydrator } from '@/components/dashboard/CreditsHydrator';
import { getSession } from '@/lib/auth/session';
import { getCreditBalance } from '@/lib/billing/repository';
import { PLANS } from '@/lib/billing/plans';
import type { PlanId } from '@/lib/billing/plans';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = getSession();
  const orgId = session?.organizationId ?? 'demo-org';
  const planId = (session?.plan?.toUpperCase() ?? 'PRO') as PlanId;

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
