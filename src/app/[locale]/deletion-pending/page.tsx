import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { getSessionState } from '@/lib/session';
import { daysRemainingInGrace, isPastGrace } from '@/lib/gdpr/constants';
import { soleOwnershipOf } from '@/lib/gdpr/org-deletion';
import { DeletionPendingActions } from './DeletionPendingActions';

// Per-user and read fresh on every visit: the days left and whether there is
// anything to cancel at all must never come from a cached render.
export const dynamic = 'force-dynamic';

/**
 * The ONE page an account with a pending deletion request may open (founder's
 * decision: sign in during the 30 days, but only to cancel). Every other page
 * sends it here — the (dashboard) layout, onboarding, and the two pages that
 * sit outside the dashboard (redirectIfDeletionPending) — and every API route
 * but the cancel one sees no user for it (session callback in src/auth.ts).
 *
 * Two choices only: cancel (DELETE /api/gdpr/account, the same route and the
 * same effect as the button in Settings → Security) or sign out.
 */
export default async function DeletionPendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const state = await getSessionState();
  if (state.status === 'anonymous') redirect(`/${locale}/login`);
  // Nothing pending (never was, or just cancelled): this page has no purpose.
  if (state.status !== 'deletion-pending') redirect(`/${locale}/overview`);

  const user = await prisma.user.findUnique({
    where: { id: state.userId },
    select: { deletionRequestedAt: true },
  });
  const requestedAt = user?.deletionRequestedAt;
  if (!requestedAt) redirect(`/${locale}/overview`);

  // The company part mirrors exactly what the cancel route
  // (DELETE /api/gdpr/account, no scope) will take back together with the
  // account:
  //   • companies this person is the ONLY member of — their deletion is
  //     waiting for the founder's confirmation, and the subscription was set
  //     to end at period end (founder's rule, option b);
  //   • a request made before the account/company split, which stamped the
  //     company with the very same instant as the account.
  const [ownership, legacyOrganizations] = await Promise.all([
    soleOwnershipOf(state.userId),
    prisma.organization.findMany({
      where: { deletionRequestedAt: requestedAt, memberships: { some: { userId: state.userId } } },
      select: { name: true },
    }),
  ]);
  const pendingOrganizations = ownership.alone.map((o) => o.name);
  const organizationIncluded = legacyOrganizations.length > 0;

  const expired = isPastGrace(requestedAt);
  const t = await getTranslations('deletionPending');

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary">
            <Clock className="h-6 w-6 text-primary" />
          </span>
          <CardTitle className="mt-3">{expired ? t('expiredTitle') : t('title')}</CardTitle>
          <CardDescription className="tabular-nums">
            {expired ? t('expiredBody') : t('body', { days: daysRemainingInGrace(requestedAt) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!expired && (
            <>
              {legacyOrganizations.map((o) => (
                <p key={o.name}>{t('bodyWithOrganization', { organization: o.name })}</p>
              ))}
              {pendingOrganizations.map((name) => (
                <p key={name}>{t('bodyWithPendingOrganization', { organization: name })}</p>
              ))}
              <p>{t('reassurance')}</p>
              {organizationIncluded && <p className="text-muted-foreground">{t('subscriptionNote')}</p>}
              {pendingOrganizations.length > 0 && (
                <p className="text-muted-foreground">{t('pendingOrganizationCancelNote')}</p>
              )}
              <p className="text-muted-foreground">{t('onlyThisPage')}</p>
            </>
          )}
          <DeletionPendingActions
            locale={locale}
            canCancel={!expired}
            labels={{
              cancel: t('cancelButton'),
              cancelling: t('cancelling'),
              cancelled: t('cancelled'),
              cancelFailed: t('cancelFailed'),
              logout: t('logoutButton'),
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
