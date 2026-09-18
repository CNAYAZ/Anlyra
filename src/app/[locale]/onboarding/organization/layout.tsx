import { redirect } from 'next/navigation';
import { getSessionState } from '@/lib/session';
import { checkOrganizationAllowance } from '@/lib/billing/server-gate';

// Same guard as src/app/[locale]/onboarding/page.tsx, and for the same
// reason (see that file for the full explanation): the old rule — redirect
// away anyone with a resolvable organization — assumed nobody with an
// organization ever has a legitimate reason to be here. That assumption
// broke as soon as a second-org path existed: a consultant who is a MEMBER
// of client organizations but has CREATED none of them must still reach
// this form. The guard now checks checkOrganizationAllowance (has this
// ACCOUNT used up the organizations it is allowed to CREATE), not whether
// state is 'ok'. Reachable from /welcome (first-run) and now also from
// Settings → Organization (settings/organization/page.tsx) for an account
// that wants another one.
//
// page.tsx below is a Client Component ('use client', a multi-step form),
// so the check cannot live inside it directly — getSessionState() needs
// cookies()/auth(), both server-only. A layout is the minimal way to run it
// before the client form ever renders, without changing page.tsx at all.
//
// Cannot loop with (dashboard)/layout.tsx's redirect to /onboarding on
// 'no-org': the two states are mutually exclusive by construction
// (getSessionState returns exactly one of 'ok' | 'no-org' | 'anonymous'), so
// a user bounced away from here for having used up their allowance can
// never be bounced back here for lacking an organization — they have one,
// that is exactly why they were bounced.
export default async function OnboardingOrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const state = await getSessionState();
  if (state.status === 'ok') {
    const allowance = await checkOrganizationAllowance(state.userId);
    if (!allowance.allowed) {
      redirect(`/${locale}/overview`);
    }
  }

  return <>{children}</>;
}
