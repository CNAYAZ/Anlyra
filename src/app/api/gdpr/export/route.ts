import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { isManagerRole } from '@/lib/auth/require-role';
import { auditLog } from '@/lib/audit/log';

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
 *   • Report_b8.shareToken — a live PUBLIC link to the report's revenue,
 *     costs and cashflow, requiring no login. Creating one is owner/admin
 *     only; exporting it would let any member read it out regardless.
 * Everything excluded is a SECRET, never a fact about the person: the export
 * stays complete as a record of the user's data while being safe to email around.
 *
 * TENANT ISOLATION: organizationId comes from getAuthContext(), which resolves it
 * only through a Membership row. Every org-scoped query below filters on that
 * single id, so this endpoint can never reach another tenant's data.
 *
 * ── PERCHÉ L'AUDIT LOG ESCE, E SOLO LE RIGHE DI CHI CHIEDE ──
 * Era l'unico dato personale che questa rotta non restituiva, ed era proprio
 * quello che sopravvive alla cancellazione dell'account (id utente, indirizzo
 * IP, storico delle azioni): un buco sull'art. 15 esattamente nel punto più
 * delicato. Ora esce, filtrato su `userId` e nient'altro:
 *   • le righe degli ALTRI membri non escono — sono la loro attività, non la
 *     tua, e un export che consegna i dati di un collega sarebbe un problema
 *     peggiore di quello che stiamo chiudendo;
 *   • le righe del pannello admin non escono di conseguenza, perché non
 *     portano nessun userId (il pannello non ha login) e alcune contengono
 *     dati aziendali — es. `admin.row_deleted` scrive nome fornitore e importo
 *     della riga cancellata;
 *   • le righe `auth.login_failed` per un indirizzo inesistente non escono,
 *     sempre per assenza di userId — e non sono di nessuno.
 * NESSUN CAMPO viene tolto dalle righe che escono: verificati tutti i punti di
 * chiamata di auditLog(), nessun `metadata` contiene l'email o il nome di
 * un'altra persona (i due casi sul team registrano ruoli e l'id della
 * membership, non chi è), e il token dei link di condivisione è escluso già
 * alla fonte. Vale il criterio del resto del file: si escludono i segreti, non
 * i fatti — e l'IP di chi chiede è un fatto che lo riguarda.
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
    competitorsSeed,
    competitorsUser,
    conversations,
    integrations,
    importBatches,
    billingSubscription,
    billingInvoices,
    creditEntries,
    legacySubscriptions,
    activityLog,
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
    prisma.report_b8.findMany({
      where: { organizationId },
      // shareToken is a live credential for the report's PUBLIC link (same
      // reasoning as Invite.token above): whoever holds it can read the
      // report's revenue, costs and cashflow with no login. Creating that
      // link is restricted to owner/admin (requireManagerRole in
      // reports/[id]/share/route.ts); exporting the token here would let any
      // member — including a 'viewer' — read it out and use it as if they had
      // created the link themselves. shareCreatedAt/shareExpiresAt travel
      // without it: they only say a link exists and when it expires, which is
      // already visible in the product (reports/page.tsx shows "shared").
      select: {
        id: true,
        organizationId: true,
        title: true,
        description: true,
        sections: true,
        schedule: true,
        recipients: true,
        lastRunAt: true,
        createdAt: true,
        updatedAt: true,
        config: true,
        shareCreatedAt: true,
        shareExpiresAt: true,
      },
    }),
    prisma.customDashboard_b8.findMany({ where: { organizationId } }),
    prisma.notificationPref_b8.findMany({ where: { userId, organizationId } }),
    prisma.kPI.findMany({ where: { organizationId } }),
    // SPLIT-BRAIN, deliberately exported from BOTH tables. Competitors the user
    // actually entered or imported are written to `Competitor` (see
    // /api/data/import/commit and /api/analysis/market/competitors/[id]), while
    // `Competitor_b7` only ever receives the demo rows seeded by
    // seedCompetitors() in src/lib/session.ts — and the Mercato pages read the
    // latter. Exporting only `Competitor_b7` meant a subject-access request
    // returned demo data and silently omitted everything the user had entered,
    // which is a compliance defect. Until the split-brain itself is fixed (a
    // larger, separate job), a complete export must contain both.
    prisma.competitor_b7.findMany({ where: { organizationId } }),
    prisma.competitor.findMany({ where: { organizationId } }),
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
    // Filtered on userId ALONE — deliberately not on organizationId too, which
    // would pull in other members' rows and the admin panel's. See the note at
    // the top of the file. Newest first: this is the one group a person reads
    // rather than re-imports.
    prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
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
        'Export completo dei dati personali e aziendali. Per sicurezza NON contiene: password, token di verifica/reset, segreto 2FA, token OAuth, chiavi delle integrazioni, token dei link di condivisione dei report. Il registro delle attività (activityLog) contiene soltanto le azioni registrate a tuo nome: quelle degli altri membri sono dati loro e non compaiono qui.',
    },
    user,
    linkedAccounts: accounts,
    // Le azioni registrate a nome di chi chiede l'export, e solo le sue.
    activityLog,
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
      // Two distinct sources, kept separate so the export is self-explanatory
      // rather than a silently merged list: see the comment at the queries.
      competitors: competitorsUser,
      competitorsDemo: competitorsSeed,
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

  await auditLog({
    action: 'gdpr.export',
    userId,
    organizationId,
    // Only WHETHER the team roster was included — never any exported content.
    metadata: { teamDataIncluded: canSeeTeam },
  });

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
