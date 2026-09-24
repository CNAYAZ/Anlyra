import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { getSessionState, DELETION_PENDING_PATH } from '@/lib/session';
import { checkOrganizationAllowance } from '@/lib/billing/server-gate';

export default async function OnboardingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // This page used to redirect away anyone with a resolvable organization
  // (state 'ok'), on the theory that nothing in the product ever links here
  // for such a user. That premise is no longer true: Settings now has a
  // "create another organization" entry (settings/organization/page.tsx),
  // reachable by anyone allowed to create one — including someone who is a
  // MEMBER of an organization but never CREATED one (a consultant invited
  // into client companies, say). Gating on "already has an org" would send
  // that person straight back here without ever reaching the form.
  //
  // The real question is not "does this account already belong to an
  // organization" but "has this account already used up the organizations
  // its plan lets it CREATE" — checkOrganizationAllowance, the same check
  // the creation route enforces, counting Organization.createdByUserId, not
  // Membership. 'no-org' (a brand-new signed-up user, no organization at
  // all) and 'anonymous' fall through unchanged: a 'no-org' user has
  // created nothing, so the allowance is always open, and there is no
  // organization to send them back to if it were not.
  //
  // Cannot loop with (dashboard)/layout.tsx's redirect to /onboarding on
  // 'no-org': the two states are mutually exclusive by construction
  // (getSessionState returns exactly one of 'ok' | 'no-org' | 'anonymous' |
  // 'deletion-pending'), so a user bounced away from here for having used up
  // their allowance can never be bounced back here for lacking an
  // organization — they have one, that is exactly why they were bounced.
  const state = await getSessionState();
  // Pending deletion request: onboarding would create a new organization
  // for an account that is being deleted. The creation route refuses it
  // anyway (auth() hides the user); this keeps the form itself closed too.
  if (state.status === 'deletion-pending') {
    redirect(`/${locale}${DELETION_PENDING_PATH}`);
  }
  if (state.status === 'ok') {
    const allowance = await checkOrganizationAllowance(state.userId);
    if (!allowance.allowed) {
      redirect(`/${locale}/overview`);
    }
  }

  return <OnboardingFlow />;
}
