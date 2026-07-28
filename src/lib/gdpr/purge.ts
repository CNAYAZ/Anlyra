import { prisma } from '@/lib/prisma';
import { deletionCutoff } from './constants';

/**
 * PERMANENT deletion of users and organizations whose 30-day grace period has
 * expired. This file destroys data irreversibly — read the safety contract before
 * touching it.
 *
 * SAFETY CONTRACT
 * 1. Nothing is ever deleted by a broad predicate. The only rows this module
 *    touches are the ones whose ids come out of `findEligible*`, which requires
 *    BOTH `deletionRequestedAt: { not: null }` AND `deletionRequestedAt: { lt: cutoff }`.
 * 2. Every delete is scoped by an explicit `where` on those ids. There is no
 *    `deleteMany()` without a where clause anywhere below.
 * 3. If the selection returns nothing, the purge returns immediately: a broken
 *    or empty filter deletes NOTHING instead of everything.
 * 4. Each subject (one org, one user) is purged inside its own transaction, so a
 *    failure halfway cannot leave a half-deleted tenant.
 *
 * WHY THE EXPLICIT ORDER: most tables in this schema carry a plain
 * `organizationId` String column with NO Prisma relation (FinancialRecord,
 * Receivable, RecurringExpense, Alert, Report_b8, …). Deleting the Organization
 * row does NOT cascade to them — they would silently survive as orphans holding
 * personal data. So they are deleted explicitly FIRST, and only then the
 * Organization row, whose real relations (Membership, Invite, Transaction,
 * CashflowEntry, BudgetEntry, CustomerStat, Subscription, Insight, Integration →
 * SyncLog) cascade away on their own.
 */

export type PurgeResult = {
  cutoff: string;
  organizationsPurged: string[];
  usersPurged: string[];
  errors: { subject: string; message: string }[];
};

async function findEligibleOrganizationIds(cutoff: Date): Promise<string[]> {
  const rows = await prisma.organization.findMany({
    where: { deletionRequestedAt: { not: null, lt: cutoff } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function findEligibleUserIds(cutoff: Date): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { deletionRequestedAt: { not: null, lt: cutoff } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Deletes ONE organization and every row that belongs to it. `organizationId` must
 * come from findEligibleOrganizationIds — this function does not re-check the
 * grace period, so it must never be called with an arbitrary id.
 */
async function purgeOrganization(organizationId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Tables with a bare organizationId column and NO cascade. Each one is
    //    scoped to this single organization.
    const where = { organizationId };

    // AIMessage cascades from AIConversation, but it is removed explicitly first
    // so the purge never depends on a cascade rule staying in place. Scalar
    // filters only (ids collected first): the empty-list case deletes nothing.
    const conversationIds = (
      await tx.aIConversation.findMany({ where, select: { id: true } })
    ).map((c: { id: string }) => c.id);
    if (conversationIds.length > 0) {
      await tx.aIMessage.deleteMany({ where: { conversationId: { in: conversationIds } } });
    }
    await tx.aIConversation.deleteMany({ where });
    await tx.financialRecord.deleteMany({ where });
    await tx.receivable.deleteMany({ where });
    await tx.recurringExpense.deleteMany({ where });
    await tx.aiAlert.deleteMany({ where });
    await tx.aiAlertConfig.deleteMany({ where });
    await tx.alert.deleteMany({ where });
    await tx.report_b8.deleteMany({ where });
    await tx.customDashboard_b8.deleteMany({ where });
    await tx.notificationPref_b8.deleteMany({ where });
    await tx.kPI.deleteMany({ where });
    await tx.competitor_b7.deleteMany({ where });
    await tx.billingInvoice.deleteMany({ where });
    await tx.creditEntry.deleteMany({ where });
    await tx.billingSubscription.deleteMany({ where });

    // 2. Import data lives on the zombie _b4 family (see src/lib/import/batch-fk.ts):
    //    ImportBatch/Revenue/Cost/Kpi/Competitor hang off Organization_b4, whose id
    //    is the REAL organization id. Deleting that shadow row cascades all of them.
    await tx.organization_b4.deleteMany({ where: { id: organizationId } });

    // 3. Finally the organization itself. Its declared relations (Membership,
    //    Invite, Transaction, CashflowEntry, BudgetEntry, CustomerStat,
    //    Subscription, Insight, Integration → SyncLog) are onDelete: Cascade.
    await tx.organization.deleteMany({ where: { id: organizationId } });
  });
}

/**
 * Deletes ONE user account. `userId` must come from findEligibleUserIds.
 *
 * Scope note (founder's rule): a user purge NEVER touches company data. Rows the
 * person created inside an organization that still exists (AI conversations,
 * financial records) belong to that organization and stay. Only the account and
 * what is exclusively the account's is removed.
 */
async function purgeUser(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Invite.invitedBy has NO onDelete rule → RESTRICT. Deleting a user who ever
    // sent an invite fails on the FK unless those invites go first.
    await tx.invite.deleteMany({ where: { invitedById: userId } });

    // Per-user notification preferences: plain userId column, no relation, so no
    // cascade would ever reach them.
    await tx.notificationPref_b8.deleteMany({ where: { userId } });

    // Shadow row created by ensureImportBatchFkRows for imports.
    await tx.user_b4.deleteMany({ where: { id: userId } });

    // The user row last: Membership, Account and Session cascade from it.
    await tx.user.deleteMany({ where: { id: userId } });
  });
}

/**
 * Runs the whole purge. Safe to call repeatedly (already-deleted subjects simply
 * stop matching the selection). One failing subject is recorded and does not stop
 * the others.
 */
export async function runGdprPurge(now: Date = new Date()): Promise<PurgeResult> {
  const cutoff = deletionCutoff(now);
  const result: PurgeResult = {
    cutoff: cutoff.toISOString(),
    organizationsPurged: [],
    usersPurged: [],
    errors: [],
  };

  const [orgIds, userIds] = await Promise.all([
    findEligibleOrganizationIds(cutoff),
    findEligibleUserIds(cutoff),
  ]);

  // Guard 3 of the safety contract: nothing selected → nothing deleted.
  if (orgIds.length === 0 && userIds.length === 0) return result;

  // Organizations first: purging one removes the Memberships that link users to
  // it, so the user purge that follows has less to do.
  for (const organizationId of orgIds) {
    try {
      await purgeOrganization(organizationId);
      result.organizationsPurged.push(organizationId);
    } catch (e) {
      console.error(`[gdpr/purge] organization ${organizationId} failed:`, e);
      result.errors.push({ subject: `organization:${organizationId}`, message: (e as Error).message });
    }
  }

  for (const userId of userIds) {
    try {
      await purgeUser(userId);
      result.usersPurged.push(userId);
    } catch (e) {
      console.error(`[gdpr/purge] user ${userId} failed:`, e);
      result.errors.push({ subject: `user:${userId}`, message: (e as Error).message });
    }
  }

  return result;
}
