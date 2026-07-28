import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { isManagerRole } from '@/lib/auth/require-role';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GDPR art. 15/20 — data portability. Streams back everything Anlyra holds about
 * the signed-in user and their current organization, as one downloadable JSON.
 *
 * WHAT IS DELIBERATELY EXCLUDED (never leaves the server):
 *   • User.passwordHash — a credential, not personal data the user needs back.
 *   • emailVerifyToken / passwordResetToken (+ their expiries) — live secrets:
 *     exporting them would hand out account-takeover material.
 *   • twoFactorSecret / twoFactorBackupCodes — the 2FA seed IS the second factor.
 *   • Account.access_token / refresh_token / id_token — OAuth credentials.
 *   • Integration.apiKey and Integration.config — third-party credentials.
 *   • Invite.token — a live join link for the organization.
 * Everything excluded is a SECRET, never a fact about the person: the export
 * stays complete as a record of the user's data while being safe to email around.
 *
 * TENANT ISOLATION: organizationId comes from getAuthContext(), which resolves it
 * only through a Membership row. Every org-scoped query below filters on that
 * single id, so this endpoint can never reach another tenant's data.
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return fail('Unauthorized', 401);
  const { userId, organizationId, role } = ctx;

  // The full team roster is other people's personal data. An owner/admin already
  // manages it in Settings → Team, so it belongs in their company export; a
  // plain member gets only their own membership row.
  const canSeeTeam = isManagerRole(role);

  const [
    user,
    accounts,
    memberships,
    organization,
    invites,
    financialRecords,
    receivables,
    recurringExpenses,
    transactions,
    cashflowEntries,
    budgetEntries,
    customerStats,
    insights,
    alerts,
    aiAlerts,
    aiAlertConfigs,
    reports,
    customDashboards,
    notificationPrefs,
    kpis,
    competitors,
    conversations,
    integrations,
    importBatches,
    billingSubscription,
    billingInvoices,
    creditEntries,
    legacySubscriptions,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      // Explicit select: an allow-list, so a future secret column added to User
      // is NOT exported by accident.
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        locale: true,
        createdAt: true,
        emailVerifiedAt: true,
        twoFactorEnabledAt: true,
        lastLoginAt: true,
        deletionRequestedAt: true,
      },
    }),
    prisma.account.findMany({
      where: { userId },
      // Which providers are linked — never the tokens behind them.
      select: { provider: true, type: true, providerAccountId: true },
    }),
    canSeeTeam
      ? prisma.membership.findMany({
          where: { organizationId },
          select: {
            id: true,
            role: true,
            isDefault: true,
            joinedAt: true,
            user: { select: { id: true, email: true, name: true } },
          },
        })
      : prisma.membership.findMany({
          where: { userId },
          select: { id: true, organizationId: true, role: true, isDefault: true, joinedAt: true },
        }),
    prisma.organization.findUnique({ where: { id: organizationId } }),
    canSeeTeam
      ? prisma.invite.findMany({
          where: { organizationId },
          // token omitted on purpose: it is a live credential to join the org.
          select: {
            id: true,
            email: true,
            role: true,
            acceptedAt: true,
            expiresAt: true,
            createdAt: true,
            invitedById: true,
          },
        })
      : Promise.resolve([]),
    prisma.financialRecord.findMany({ where: { organizationId } }),
    prisma.receivable.findMany({ where: { organizationId } }),
    prisma.recurringExpense.findMany({ where: { organizationId } }),
    prisma.transaction.findMany({ where: { organizationId } }),
    prisma.cashflowEntry.findMany({ where: { organizationId } }),
    prisma.budgetEntry.findMany({ where: { organizationId } }),
    prisma.customerStat.findMany({ where: { organizationId } }),
    prisma.insight.findMany({ where: { organizationId } }),
    prisma.alert.findMany({ where: { organizationId } }),
    prisma.aiAlert.findMany({ where: { organizationId } }),
    prisma.aiAlertConfig.findMany({ where: { organizationId } }),
    prisma.report_b8.findMany({ where: { organizationId } }),
    prisma.customDashboard_b8.findMany({ where: { organizationId } }),
    prisma.notificationPref_b8.findMany({ where: { userId, organizationId } }),
    prisma.kPI.findMany({ where: { organizationId } }),
    prisma.competitor_b7.findMany({ where: { organizationId } }),
    // One query with nested messages — not a per-conversation N+1 loop.
    prisma.aIConversation.findMany({
      where: { organizationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    }),
    prisma.integration.findMany({
      where: { organizationId },
      // apiKey and config hold third-party credentials — excluded.
      select: {
        id: true,
        provider: true,
        status: true,
        frequency: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.importBatch.findMany({ where: { organizationId } }),
    prisma.billingSubscription.findUnique({
      where: { organizationId },
      // Stripe ids identify the account at Stripe: not needed for portability.
      select: {
        plan: true,
        status: true,
        cycle: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.billingInvoice.findMany({ where: { organizationId } }),
    prisma.creditEntry.findMany({ where: { organizationId } }),
    prisma.subscription.findMany({ where: { organizationId } }),
  ]);

  if (!user) return fail('NOT_FOUND', 404);

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      format: 'anlyra-gdpr-export/v1',
      organizationId,
      requestedBy: { userId, role },
      teamDataIncluded: canSeeTeam,
      note:
        'Export completo dei dati personali e aziendali. Per sicurezza NON contiene: password, token di verifica/reset, segreto 2FA, token OAuth, chiavi delle integrazioni.',
    },
    user,
    linkedAccounts: accounts,
    memberships,
    organization,
    invites,
    financial: {
      financialRecords,
      transactions,
      cashflowEntries,
      budgetEntries,
      customerStats,
      receivables,
      recurringExpenses,
    },
    ai: {
      insights,
      alerts,
      aiAlerts,
      aiAlertConfigs,
      conversations,
      kpis,
      competitors,
    },
    workspace: {
      reports,
      customDashboards,
      notificationPrefs,
      importBatches,
      integrations,
    },
    billing: {
      subscription: billingSubscription,
      invoices: billingInvoices,
      creditEntries,
      legacySubscriptions,
    },
  };

  const filename = `anlyra-export-${organizationId}-${new Date().toISOString().slice(0, 10)}.json`;

  // Returned as a file download rather than through ok(): the user is meant to
  // keep this JSON, not for an app screen to parse it.
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
