import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/audit/log';
import { buildInsightWhere } from './queries';

/**
 * WRITE operations for the admin panel.
 *
 * RULES THIS FILE FOLLOWS, WITHOUT EXCEPTION:
 *  • every function targets rows by an explicit id or an explicit filter —
 *    never a bare deleteMany/updateMany that would hit the whole table;
 *  • every function writes an 'admin.*' audit row, so an operator action is
 *    always distinguishable from a user's;
 *  • the audit row carries NO userId: the panel has no login (it is protected
 *    by only being reachable on the founder's localhost), so claiming a user id
 *    would be a lie in the trail.
 */

export const VALID_ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;
export type ValidRole = (typeof VALID_ROLES)[number];

/**
 * Plans accepted when setting an organization's plan. Mirrors PlanId in
 * src/lib/billing/plans.ts; kept as a local literal so the panel cannot be the
 * reason a new plan silently becomes settable before billing supports it.
 */
export const VALID_PLANS = ['PRO', 'ADVANCED', 'ENTERPRISE'] as const;
export type ValidPlan = (typeof VALID_PLANS)[number];

/** Tables whose individual test rows the panel may delete, by id. */
export const DELETABLE_TABLES = ['receivable', 'recurringExpense', 'financialRecord'] as const;
export type DeletableTable = (typeof DELETABLE_TABLES)[number];

/**
 * Sets an organization's credit balances.
 *
 * ── WHY TWO NUMBERS AND NOT ONE ──
 * The balance is two columns, and they behave differently:
 *  • aiCredits — the monthly PLAN allowance. The renewal job overwrites it at
 *    the start of every billing period, so anything put here is temporary: it
 *    survives until the next renewal and no longer.
 *  • aiCreditsPurchased — credits the customer PAID FOR. Nothing overwrites it.
 * That difference is the whole reason the columns were split, and it decides
 * which one the founder should be typing into. Compensating a customer for
 * credits lost to a bug means writing the PURCHASED column: put it in the plan
 * column and the next monthly renewal deletes the make-good, leaving the
 * customer worse off than before the apology. Topping up a plan allowance for
 * the current month is the plan column.
 *
 * Either number may be omitted; only the columns actually supplied are written,
 * so a top-up of one cannot silently clear the other. Both are absolute values
 * (set, not add), matching what the panel has always done.
 */
export async function setCredits(
  organizationId: string,
  values: { plan?: number; purchased?: number },
) {
  if (values.plan === undefined && values.purchased === undefined) {
    throw new Error('setCredits: indicare almeno uno fra crediti di piano e crediti acquistati.');
  }

  const before = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { aiCredits: true, aiCreditsPurchased: true, name: true },
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(values.plan !== undefined ? { aiCredits: { set: values.plan } } : {}),
      ...(values.purchased !== undefined ? { aiCreditsPurchased: { set: values.purchased } } : {}),
    },
  });

  const after = {
    plan: values.plan ?? before.aiCredits,
    purchased: values.purchased ?? before.aiCreditsPurchased,
  };

  await auditLog({
    action: 'admin.credits_set',
    organizationId,
    targetType: 'organization',
    targetId: organizationId,
    // Both columns recorded either way, so the trail says what the balance was
    // and what it became — not just the half that happened to be edited.
    // Flat keys: auditLog's metadata is deliberately Record<string, scalar>, so
    // a nested { from: {...} } would not survive its type (or its intent).
    metadata: {
      fromPlan: before.aiCredits,
      toPlan: after.plan,
      fromPurchased: before.aiCreditsPurchased,
      toPurchased: after.purchased,
    },
  });

  return {
    organizationName: before.name,
    from: { plan: before.aiCredits, purchased: before.aiCreditsPurchased },
    to: after,
  };
}

/**
 * Sets the plan on BOTH columns that carry one.
 *
 * WHY BOTH — the known divergence:
 *  • BillingSubscription.plan is AUTHORITATIVE: getBillingState() reads it, so
 *    it drives feature gating, plan limits, and how many credits the monthly
 *    renewal grants (src/lib/cron/credit-renewal.ts).
 *  • Organization.plan is LEGACY (schema default "STARTER", which is not even a
 *    valid PlanId). It is read in only two places: getCurrentOrganization(),
 *    whose plan value no caller currently uses, and trial-check.ts, where it
 *    picks the plan NAME AND PRICE printed in trial emails.
 * Writing only one of them is exactly what produces an org that behaves as PRO
 * while its emails advertise something else, so the panel always writes both
 * and reports what it did.
 *
 * The subscription row is upserted, not updated: an org that never subscribed
 * has no row at all, and the update would throw instead of doing the obvious
 * thing.
 */
export async function setPlan(organizationId: string, plan: ValidPlan) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true, plan: true },
  });
  const sub = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: { plan: true },
  });

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: {
        plan,
        // A subscription CREATED right here (no prior row — `sub === null`)
        // lands on the schema's own default, BillingSubscription.status
        // @default("active"), with no Stripe checkout involved at all: for
        // trial-email purposes the founder granting a plan by hand is exactly
        // as much a "this org now pays" event as the webhook is (see
        // src/app/api/webhooks/stripe/route.ts). Without this, an org
        // activated from here would still be a candidate for "3 days left in
        // your trial" — the same bug this whole change fixes, reached through
        // a different door.
        // Only on the CREATE path: `update: { plan }` below changes the plan
        // of an EXISTING row without touching its status, so it is NOT a
        // "becomes active" event and must not clear trialEndsAt.
        ...(sub === null ? { trialEndsAt: null } : {}),
      },
    }),
    prisma.billingSubscription.upsert({
      where: { organizationId },
      create: { organizationId, plan },
      update: { plan },
    }),
  ]);

  await auditLog({
    action: 'admin.plan_set',
    organizationId,
    targetType: 'organization',
    targetId: organizationId,
    metadata: {
      organizationPlanFrom: org.plan,
      subscriptionPlanFrom: sub?.plan ?? 'nessun abbonamento',
      to: plan,
      subscriptionRowCreated: sub === null,
    },
  });

  return {
    organizationName: org.name,
    organizationPlanFrom: org.plan,
    subscriptionPlanFrom: sub?.plan ?? null,
    subscriptionRowCreated: sub === null,
    to: plan,
  };
}

export async function setMemberRole(userId: string, organizationId: string, role: ValidRole) {
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { userId_organizationId: { userId, organizationId } },
    select: { role: true, user: { select: { email: true } }, organization: { select: { name: true } } },
  });

  await prisma.membership.update({
    where: { userId_organizationId: { userId, organizationId } },
    data: { role },
  });

  await auditLog({
    action: 'admin.member_role_set',
    organizationId,
    targetType: 'membership',
    targetId: `${userId}:${organizationId}`,
    metadata: { from: membership.role, to: role },
  });

  return {
    email: membership.user.email,
    organizationName: membership.organization.name,
    from: membership.role,
    to: role,
  };
}

/**
 * Deletes insights matching a filter. REFUSES when no filter is given —
 * see buildInsightWhere: an empty where would delete every insight of every
 * organization.
 */
export async function deleteInsights(filters: {
  organizationId?: string;
  status?: string;
  olderThanDays?: number;
}) {
  const where = buildInsightWhere(filters);
  if (!where) {
    throw new Error(
      'Nessun filtro indicato: rifiuto di cancellare. Specifica almeno organizzazione, stato o giorni.',
    );
  }

  const result = await prisma.insight.deleteMany({ where });

  await auditLog({
    action: 'admin.insights_deleted',
    organizationId: filters.organizationId ?? null,
    targetType: 'insight',
    metadata: {
      deleted: result.count,
      filterOrganizationId: filters.organizationId ?? 'tutte',
      filterStatus: filters.status ?? 'tutti',
      filterOlderThanDays: filters.olderThanDays ?? 0,
    },
  });

  return { deleted: result.count };
}

/** Deletes ONE row, by id, from one of the allowed tables. */
export async function deleteRowById(table: DeletableTable, id: string) {
  let organizationId: string | null = null;
  let describe = '';

  if (table === 'receivable') {
    const row = await prisma.receivable.findUniqueOrThrow({
      where: { id },
      select: { organizationId: true, customerName: true, amount: true },
    });
    organizationId = row.organizationId;
    describe = `${row.customerName} — ${row.amount}`;
    await prisma.receivable.delete({ where: { id } });
  } else if (table === 'recurringExpense') {
    const row = await prisma.recurringExpense.findUniqueOrThrow({
      where: { id },
      select: { organizationId: true, vendorName: true, amount: true },
    });
    organizationId = row.organizationId;
    describe = `${row.vendorName} — ${row.amount}`;
    await prisma.recurringExpense.delete({ where: { id } });
  } else {
    const row = await prisma.financialRecord.findUniqueOrThrow({
      where: { id },
      select: { organizationId: true, type: true, amount: true },
    });
    organizationId = row.organizationId;
    describe = `${row.type} — ${row.amount}`;
    await prisma.financialRecord.delete({ where: { id } });
  }

  await auditLog({
    action: 'admin.row_deleted',
    organizationId,
    targetType: table,
    targetId: id,
    // A short label so the trail says WHAT was removed. Amounts are financial
    // data, so this is the one place the panel records one — deliberately, and
    // only for a row an operator chose to destroy by id.
    metadata: { table, describe },
  });

  return { table, id, organizationId, describe };
}

/**
 * Un-blocks an account. Two independent repairs, each opt-in:
 *  • clearDeletion — clears the GDPR deletion request on the user AND on their
 *    organizations, so the purge cron stops counting down (src/lib/gdpr/purge.ts).
 *  • restoreOwner — puts a membership back to 'owner'. This exists because it
 *    actually happened: the founder set his own membership to 'viewer' and
 *    locked himself out of every owner/admin action in his own organization.
 */
export async function unblockAccount(params: {
  userId: string;
  organizationId?: string;
  clearDeletion: boolean;
  restoreOwner: boolean;
}) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: params.userId },
    select: { email: true, deletionRequestedAt: true },
  });

  const done: string[] = [];

  if (params.clearDeletion) {
    await prisma.user.update({
      where: { id: params.userId },
      data: { deletionRequestedAt: null },
    });
    done.push('richiesta di cancellazione utente azzerata');

    // Also the organizations this user belongs to: an org-level deletion
    // request purges the whole org, so clearing only the user would leave the
    // real countdown running.
    const memberships = await prisma.membership.findMany({
      where: { userId: params.userId },
      select: { organizationId: true },
    });
    if (memberships.length > 0) {
      const cleared = await prisma.organization.updateMany({
        // Explicit id list — never an unfiltered updateMany.
        where: {
          id: { in: memberships.map((m) => m.organizationId) },
          deletionRequestedAt: { not: null },
        },
        data: { deletionRequestedAt: null },
      });
      if (cleared.count > 0) {
        done.push(`richiesta di cancellazione azzerata su ${cleared.count} organizzazione/i`);
      }
    }
  }

  if (params.restoreOwner) {
    if (!params.organizationId) {
      throw new Error('Per riportare il ruolo a owner serve indicare l\'organizzazione.');
    }
    await prisma.membership.update({
      where: { userId_organizationId: { userId: params.userId, organizationId: params.organizationId } },
      data: { role: 'owner' },
    });
    done.push('ruolo riportato a owner');
  }

  if (done.length === 0) {
    throw new Error('Nessuna operazione selezionata.');
  }

  await auditLog({
    action: 'admin.account_unblocked',
    organizationId: params.organizationId ?? null,
    targetType: 'user',
    targetId: params.userId,
    metadata: {
      email: user.email,
      clearDeletion: params.clearDeletion,
      restoreOwner: params.restoreOwner,
    },
  });

  return { email: user.email, done };
}

export const CRON_JOBS = ['trial-check', 'gdpr-purge'] as const;
export type CronJob = (typeof CRON_JOBS)[number];

/**
 * Calls a real cron endpoint with the Bearer secret from the environment.
 *
 * THE SECRET NEVER LEAVES THIS FUNCTION: it is read from process.env, put in
 * the Authorization header, and never returned, logged, or included in any
 * response the browser sees. If it is missing the caller gets a plain
 * "not configured" message, not the value.
 *
 * `baseUrl` defaults to the local app on :3000 — the panel drives the app's own
 * endpoints, so the dev server must be running for these buttons to work.
 */
export async function runCron(job: CronJob, baseUrl = 'http://127.0.0.1:3000') {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error('CRON_SECRET non configurata: impossibile lanciare i cron.');
  }

  const url = `${baseUrl}/api/cron/${job}`;
  let status: number;
  let body: string;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
    status = res.status;
    body = (await res.text()).slice(0, 4000);
  } catch (e) {
    throw new Error(
      `Impossibile contattare ${url}. Il server dell'app è avviato sulla porta 3000? ` +
        `(${(e as Error).message})`,
    );
  }

  await auditLog({
    action: 'admin.cron_triggered',
    targetType: 'cron',
    targetId: job,
    outcome: status >= 200 && status < 300 ? 'success' : 'failure',
    metadata: { job, status },
  });

  return { job, status, body };
}
