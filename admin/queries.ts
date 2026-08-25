import { prisma } from '@/lib/prisma';

/**
 * READ-ONLY data for the admin panel. Nothing in this file writes.
 *
 * Every list is capped: this panel is a window onto a live production database
 * and an unbounded findMany on a growing table is how a "just look at it" page
 * becomes a slow query against the site customers are using.
 */

const LIST_LIMIT = 200;
const AUDIT_LIMIT = 100;

export type OrgRow = {
  id: string;
  name: string;
  slug: string;
  /** Legacy column, default "STARTER". See PLAN_FIELDS_NOTE. */
  organizationPlan: string;
  /** Authoritative for features/limits/renewal, or null when the org has no subscription row. */
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  aiCredits: number;
  createdAt: string;
  memberCount: number;
};

export async function listOrganizations(): Promise<OrgRow[]> {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      aiCredits: true,
      createdAt: true,
      _count: { select: { memberships: true } },
    },
  });

  // Subscriptions fetched separately and joined in memory: BillingSubscription
  // has no Prisma relation to Organization (it references it by id only), so
  // there is no `include` to use here.
  const subs = await prisma.billingSubscription.findMany({
    where: { organizationId: { in: orgs.map((o) => o.id) } },
    select: { organizationId: true, plan: true, status: true },
  });
  const subByOrg = new Map(subs.map((s) => [s.organizationId, s]));

  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    organizationPlan: o.plan,
    subscriptionPlan: subByOrg.get(o.id)?.plan ?? null,
    subscriptionStatus: subByOrg.get(o.id)?.status ?? null,
    aiCredits: o.aiCredits,
    createdAt: o.createdAt.toISOString(),
    memberCount: o._count.memberships,
  }));
}

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  verified: boolean;
  lastLoginAt: string | null;
  deletionRequestedAt: string | null;
  memberships: { organizationId: string; organizationName: string; role: string; isDefault: boolean }[];
};

export async function listUsers(): Promise<UserRow[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    select: {
      id: true,
      email: true,
      name: true,
      emailVerifiedAt: true,
      emailVerified: true,
      lastLoginAt: true,
      deletionRequestedAt: true,
      memberships: {
        select: {
          organizationId: true,
          role: true,
          isDefault: true,
          organization: { select: { name: true } },
        },
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    // Two columns record the same fact (emailVerifiedAt is this app's,
    // emailVerified is the Auth.js adapter's): either one counts as verified.
    verified: Boolean(u.emailVerifiedAt ?? u.emailVerified),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    deletionRequestedAt: u.deletionRequestedAt?.toISOString() ?? null,
    memberships: u.memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      role: m.role,
      isDefault: m.isDefault,
    })),
  }));
}

export type AuditRow = {
  id: string;
  action: string;
  userId: string | null;
  organizationId: string | null;
  targetType: string | null;
  targetId: string | null;
  outcome: string;
  metadata: string | null;
  createdAt: string;
};

export async function listAuditLog(filters: {
  action?: string;
  organizationId?: string;
}): Promise<AuditRow[]> {
  const rows = await prisma.auditLog.findMany({
    where: {
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: AUDIT_LIMIT,
  });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    userId: r.userId,
    organizationId: r.organizationId,
    targetType: r.targetType,
    targetId: r.targetId,
    outcome: r.outcome,
    metadata: r.metadata,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Distinct action values actually present, so the filter offers real options. */
export async function listAuditActions(): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    distinct: ['action'],
    select: { action: true },
    orderBy: { action: 'asc' },
    take: 100,
  });
  return rows.map((r) => r.action);
}

export type Counts = {
  organizations: number;
  users: number;
  financialRecords: number;
  receivables: number;
  recurringExpenses: number;
  insights: number;
  reports: number;
  aiConversations: number;
  auditLogRows: number;
};

export async function getCounts(): Promise<Counts> {
  const [
    organizations,
    users,
    financialRecords,
    receivables,
    recurringExpenses,
    insights,
    reports,
    aiConversations,
    auditLogRows,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.financialRecord.count(),
    prisma.receivable.count(),
    prisma.recurringExpense.count(),
    prisma.insight.count(),
    // Report_b8 carries the dead-model suffix but is the ACTIVE reports table
    // (see CLAUDE.md §9) — not a zombie.
    prisma.report_b8.count(),
    prisma.aIConversation.count(),
    prisma.auditLog.count(),
  ]);

  return {
    organizations,
    users,
    financialRecords,
    receivables,
    recurringExpenses,
    insights,
    reports,
    aiConversations,
    auditLogRows,
  };
}

/** Preview for the insight cleanup: how many rows a given filter would delete. */
export async function countInsightsMatching(filters: {
  organizationId?: string;
  status?: string;
  olderThanDays?: number;
}): Promise<number> {
  const where = buildInsightWhere(filters);
  if (!where) return 0;
  return prisma.insight.count({ where });
}

/**
 * Builds the `where` for insight deletion, or null when NO filter was given.
 *
 * Returning null on an empty filter is the safety rule, not an edge case: an
 * empty `where` on deleteMany wipes the table for every organization. The
 * caller must treat null as "refuse", never as "match everything".
 */
export function buildInsightWhere(filters: {
  organizationId?: string;
  status?: string;
  olderThanDays?: number;
}): Record<string, unknown> | null {
  const where: Record<string, unknown> = {};
  if (filters.organizationId) where.organizationId = filters.organizationId;
  if (filters.status) where.status = filters.status;
  if (typeof filters.olderThanDays === 'number' && filters.olderThanDays > 0) {
    where.createdAt = { lt: new Date(Date.now() - filters.olderThanDays * 86_400_000) };
  }
  return Object.keys(where).length > 0 ? where : null;
}
