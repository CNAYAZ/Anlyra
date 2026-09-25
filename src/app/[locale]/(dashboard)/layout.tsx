import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { CreditsHydrator } from '@/components/dashboard/CreditsHydrator';
import { TrialExpiredBanner } from '@/components/billing/TrialExpiredBanner';
import { LegalReacceptBanner } from '@/components/legal/LegalReacceptBanner';
import { prisma } from '@/lib/prisma';
import { needsLegalReaccept } from '@/lib/legal/version';
import {
  getCurrentOrganization,
  getSessionState,
  hasDemoSession,
  isDemoOrganization,
  getAuthContext,
  DELETION_PENDING_PATH,
} from '@/lib/session';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { DemoProvider } from '@/lib/demo/context';
import { getCreditBalance, getBillingState } from '@/lib/billing/repository';
import { BillingProvider } from '@/lib/billing/context';
import { PLANS } from '@/lib/billing/plans';
import type { PlanId } from '@/lib/billing/plans';
import { isOwnerRole, isManagerRole, isEditorRole } from '@/lib/auth/require-role';
import { OwnerProvider, ManagerProvider, ReadOnlyRoleProvider } from '@/lib/auth/owner-context';
import { ReadOnlyRoleBanner } from '@/components/auth/ReadOnlyRoleBanner';
import { isPastGrace, DELETION_GRACE_DAYS } from '@/lib/gdpr/constants';
import { OrgDeletionPendingBanner } from '@/components/gdpr/OrgDeletionPendingBanner';

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
  // Pending deletion request: every dashboard page leads to the one screen
  // where it can be cancelled. Outside this segment, so it cannot loop.
  if (state.status === 'deletion-pending') {
    redirect(`/${locale}${DELETION_PENDING_PATH}`);
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
  // Only the id is taken here: the plan this layout acts on comes from
  // getBillingState() below (BillingSubscription, the authoritative column) —
  // never from a client cookie, and never from the legacy Organization.plan.
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

  // Real role, for the same reason as isDemo above: only for a real signed-in
  // member (getAuthContext() returns null for the anonymous demo visitor,
  // which has no Membership row at all — treated as not-owner, matching the
  // fact that billing is refused server-side for the demo org regardless).
  const authCtx = isDemo ? null : await getAuthContext();
  const isOwner = authCtx ? isOwnerRole(authCtx.role) : false;
  // Same reasoning as isOwner above, for owner-OR-admin: lets the scheduled
  // reports page disable the edit control instead of offering an action that
  // requireManagerRole would refuse server-side.
  const isManager = authCtx ? isManagerRole(authCtx.role) : false;
  // Same reasoning again, for the widest split: a member who may only read
  // ('viewer'). False for the demo, which has its own read-only handling.
  const isReadOnlyRole = authCtx ? !isEditorRole(authCtx.role) : false;

  // Same gating as isOwner/isManager above: only for a real signed-in member,
  // never the demo (no account exists there to accept anything for). Read
  // fresh from the DB every render — this is the one value in this layout
  // that must never be trusted from a client cookie or a stale session claim,
  // because it decides whether to ask for a legal acceptance.
  const needsReaccept = authCtx
    ? needsLegalReaccept(
        (
          await prisma.user.findUnique({
            where: { id: authCtx.userId },
            select: { termsAcceptedVersion: true },
          })
        )?.termsAcceptedVersion,
      )
    : false;

  // Same gating as needsReaccept above: only for a real signed-in member,
  // never the demo (which can never have a pending deletion request at all).
  // The requester's OWN account never reaches this layout in the first place
  // — their User.deletionRequestedAt sends them to /deletion-pending above —
  // so whoever sees this banner is always one of the OTHER members.
  const orgForDeletionBanner = authCtx
    ? await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, deletionRequestedAt: true },
      })
    : null;
  const orgDeletionDate =
    orgForDeletionBanner?.deletionRequestedAt && !isPastGrace(orgForDeletionBanner.deletionRequestedAt)
      ? new Date(
          orgForDeletionBanner.deletionRequestedAt.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString()
      : null;

  return (
    <BillingProvider initialState={billingState}>
      {/* Makes `isDemo` available to every client component below, so the UI can
          disable the controls that the server would refuse anyway. */}
      <DemoProvider isDemo={isDemo}>
        {/* Same idea as DemoProvider, for billing: the portal/checkout routes
            refuse anyone but 'owner' — this lets the billing page hide those
            controls instead of offering a button that would 403. */}
        <OwnerProvider isOwner={isOwner}>
          <ManagerProvider isManager={isManager}>
            <ReadOnlyRoleProvider isReadOnly={isReadOnlyRole}>
            <div className="flex min-h-screen bg-background">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <Topbar />
                {/* Demo notice first: it explains what the whole page is. Like the
                    trial strip it pushes content down instead of covering it. */}
                <DemoBanner />
                {/* Same strip again, for a member who may only read: explains
                    why every create/edit control below is disabled. */}
                <ReadOnlyRoleBanner />
                {/* Read-only strip for expired trials (renders null for active/trialing).
                    A strip that pushes content down, never an overlay — data stays visible. */}
                <TrialExpiredBanner />
                {/* Same shape again: asks for acceptance of updated legal documents
                    without blocking anything. Renders null when needsReaccept is false. */}
                <LegalReacceptBanner needsReaccept={needsReaccept} />
                {/* Same shape again, for every OTHER member while the organization
                    itself has a pending deletion request. Renders null when
                    orgDeletionDate is null. */}
                <OrgDeletionPendingBanner
                  deletionDate={orgDeletionDate}
                  organizationName={orgForDeletionBanner?.name ?? ''}
                />
                <main className="flex-1 p-6">
                  <div className="mx-auto w-full max-w-[1440px]">{children}</div>
                </main>
              </div>
              <CreditsHydrator credits={credits} max={planMax} />
            </div>
            </ReadOnlyRoleProvider>
          </ManagerProvider>
        </OwnerProvider>
      </DemoProvider>
    </BillingProvider>
  );
}
