import { redirect } from 'next/navigation';
import { getSessionState } from '@/lib/session';

// Same guard as src/app/[locale]/onboarding/page.tsx, and for the same
// reason: a signed-in user who already has an organization must not reach
// this second creation form either — reachable from /welcome, with no button
// anywhere in the product linking here for someone who already has an org.
//
// page.tsx below is a Client Component ('use client', a multi-step form),
// so the check cannot live inside it directly — getSessionState() needs
// cookies()/auth(), both server-only. A layout is the minimal way to run it
// before the client form ever renders, without changing page.tsx at all.
//
// Cannot loop with (dashboard)/layout.tsx's redirect to /onboarding on
// 'no-org': the two states are mutually exclusive by construction
// (getSessionState returns exactly one of 'ok' | 'no-org' | 'anonymous'), so
// a user bounced away from here for having an org can never be bounced back
// for lacking one.
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
    redirect(`/${locale}/overview`);
  }

  return <>{children}</>;
}
