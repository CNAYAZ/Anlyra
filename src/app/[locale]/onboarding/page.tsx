import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { getSessionState } from '@/lib/session';

export default async function OnboardingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // This page had no guard at all: a signed-in user who already has an
  // organization could reach the creation form just by typing the address —
  // no button anywhere in the product links here for them (verified in the
  // audit: OrgSwitcher hides itself when there is nothing to switch between,
  // and neither message catalog has a "new organization" string). Redirect
  // only on 'ok' (a resolvable organization already exists) — 'no-org' and
  // 'anonymous' fall through unchanged, so the real first-run path this page
  // exists for is untouched.
  //
  // Cannot loop with (dashboard)/layout.tsx's redirect to /onboarding on
  // 'no-org': the two states are mutually exclusive by construction
  // (getSessionState returns exactly one of 'ok' | 'no-org' | 'anonymous'),
  // so a user bounced away from here for having an org can never be bounced
  // back for lacking one.
  const state = await getSessionState();
  if (state.status === 'ok') {
    redirect(`/${locale}/overview`);
  }

  return <OnboardingFlow />;
}
