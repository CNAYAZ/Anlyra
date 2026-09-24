import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { getAuthContext, getSessionState } from '@/lib/session';
import { isManagerRole } from '@/lib/auth/require-role';
import { daysRemainingInGrace, isPastGrace } from '@/lib/gdpr/constants';
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

  // The organization part mirrors exactly what the cancel route will do: it
  // resolves the same context and only touches the organization for an
  // owner/admin whose organization is itself pending.
  const ctx = await getAuthContext({ allowDeletionPending: true });
  const organization =
    ctx && isManagerRole(ctx.role)
      ? await prisma.organization.findUnique({
          where: { id: ctx.organizationId },
          select: { name: true, deletionRequestedAt: true },
        })
      : null;
  const organizationIncluded =
    !!organization?.deletionRequestedAt && !isPastGrace(organization.deletionRequestedAt);

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
              {organizationIncluded && organization && (
                <p>{t('bodyWithOrganization', { organization: organization.name })}</p>
              )}
              <p>{t('reassurance')}</p>
              {organizationIncluded && <p className="text-muted-foreground">{t('subscriptionNote')}</p>}
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
