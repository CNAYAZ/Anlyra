import {
  PLANS,
  type FeatureKey,
  type IntegrationKey,
  type PlanId,
  planHasFeature,
  planHasIntegration,
  getMinPlanForFeature,
  countedSeats,
} from "./plans";
import { getSubscription, type Subscription } from "./repository";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api";
import { planMeets, type RequiredPlan } from "@/lib/plan/feature-gate";

// Statuses that grant full (write/produce) access. Everything else — most
// importantly "canceled" (an expired trial with no paid subscription) — is
// read-only: the org keeps seeing its data but can't run the actions that cost
// money or write new records. Feature gating elsewhere is plan-only and does NOT
// look at status, so this is the single source of truth for the status gate.
const ACTIVE_STATUSES: ReadonlyArray<Subscription["status"]> = ["active", "trialing"];

/**
 * Status gate for expensive/mutating actions (AI generation, data import/writes).
 * Returns { allowed } so the caller can respond 402 without throwing. A signed-in
 * org with a real 'active' subscription or a live 'trialing' trial is allowed;
 * an expired trial ('canceled') or 'past_due' is blocked (read-only).
 */
export async function requireActiveAccess(
  orgId: string,
): Promise<{ allowed: boolean; status: Subscription["status"] }> {
  const sub = await getSubscription(orgId);
  return { allowed: ACTIVE_STATUSES.includes(sub.status), status: sub.status };
}

export async function assertFeature(orgId: string, feature: FeatureKey): Promise<void> {
  const sub = await getSubscription(orgId);
  if (!planHasFeature(sub.plan, feature)) {
    throw Object.assign(new Error(`Feature '${feature}' not available on plan '${sub.plan}'`), {
      code: "FEATURE_LOCKED" as const,
      requiredFeature: feature,
    });
  }
}

export async function assertIntegration(
  orgId: string,
  integration: IntegrationKey,
): Promise<void> {
  const sub = await getSubscription(orgId);
  if (!planHasIntegration(sub.plan, integration)) {
    throw Object.assign(new Error(`Integration '${integration}' not available`), {
      code: "INTEGRATION_LOCKED" as const,
      requiredIntegration: integration,
    });
  }
}

/**
 * Plan gate for the integration ROUTES. Returns a ready-to-return 403 when the
 * organization's plan does not reach `requiredPlan`, or null when it does —
 * the same shape as requireManagerRole/requireWritableOrg, which these routes
 * already use, so it slots in as one more line in the same guard block.
 *
 * ── WHY NOT assertIntegration, WHICH IS RIGHT THERE ──
 * Three reasons, all verified before writing this:
 *  1. WRONG SOURCE. assertIntegration asks planHasIntegration(), i.e. the
 *     BILLING catalog (PLANS[...].integrations). The interface gates on
 *     registry.requiredPlan via planMeets(). Those two disagree today —
 *     the billing catalog gives HubSpot to ADVANCED, the registry demands
 *     ENTERPRISE — so using assertIntegration here would have produced exactly
 *     the split this gate exists to prevent: an ADVANCED customer shown a
 *     locked card by the UI and let through by the server. Which of the two is
 *     commercially right is the founder's call and is NOT decided here; what
 *     matters is that server and interface answer from ONE source, and the
 *     interface's source is the registry.
 *  2. IT CANNOT EXPRESS HALF THE PROVIDERS. Its IntegrationKey type is
 *     stripe | quickbooks | xero | salesforce | hubspot | sap. The registry
 *     ships google-analytics and shopify, which are not in that union at all,
 *     so the call would not even compile for two of the six providers.
 *  3. IT THROWS, AND NOTHING TRANSLATES IT. It throws a plain Error carrying a
 *     `code` property, while failFromError only recognises errors by `name`
 *     ('NotAuthenticatedError', 'NoOrganizationError') and turns everything
 *     else into INTERNAL_ERROR 500. A customer on the wrong plan would have
 *     received a generic server error, and the thrown message
 *     ("Integration 'x' not available on plan 'PRO'") leaks the org's plan and
 *     an internal key if anyone ever did surface it.
 * assertIntegration is left exactly as it is: it is not wrong, it answers a
 * different question (what the BILLING catalog sells), and it still has no
 * callers.
 *
 * ── WHAT THE CUSTOMER IS TOLD ──
 * The required plan and nothing else. That name is public — it is on the
 * pricing page and already printed on the locked card in the interface — while
 * the org's current plan, the provider's internal key and the shape of the
 * check stay on the server.
 */
export async function requireIntegrationPlan(
  orgId: string,
  requiredPlan: RequiredPlan,
) {
  const sub = await getSubscription(orgId);
  if (planMeets(sub.plan, requiredPlan)) return null;
  return fail(
    `Questa integrazione è disponibile dal piano ${requiredPlan}. Aggiorna il piano per attivarla.`,
    403,
  );
}

// Customer-facing plan names, in Italian like every other message fail()
// returns from these routes. The interface disables the control before the
// click with its own translated text; this is the server's backstop.
const PLAN_LABELS: Record<PlanId, string> = {
  PRO: "Pro",
  ADVANCED: "Avanzato",
  ENTERPRISE: "Enterprise",
};

/**
 * Plan gate for a feature of the price list (PLANS[...].features). Same shape
 * as requireIntegrationPlan above — a ready 403 or null — and for the same
 * reason assertFeature is not used: it throws an Error that failFromError
 * cannot translate, so the customer would get a 500. The message names the
 * plan that includes the feature and never the organization's current one.
 * Gate CREATION only: data made before a downgrade stays usable.
 */
export async function requireFeaturePlan(orgId: string, feature: FeatureKey) {
  const sub = await getSubscription(orgId);
  if (planHasFeature(sub.plan, feature)) return null;
  const required = getMinPlanForFeature(feature);
  const label = required ? PLAN_LABELS[required] : PLAN_LABELS.ENTERPRISE;
  return fail(
    `Questa funzione è inclusa dal piano ${label}. Passa al piano ${label} per usarla.`,
    403,
  );
}

export async function assertWithinLimit(
  orgId: string,
  metric: keyof (typeof PLANS)["PRO"]["limits"],
  current: number,
): Promise<void> {
  const sub = await getSubscription(orgId);
  const limit = PLANS[sub.plan].limits[metric];
  if (limit === -1) return;
  if (current >= limit) {
    throw Object.assign(new Error(`Limit reached for ${metric}`), {
      code: "LIMIT_REACHED" as const,
      metric,
      limit,
      plan: sub.plan as PlanId,
    });
  }
}

export type SeatCheck = {
  /** False when adding one more person would go past the plan's seat count. */
  allowed: boolean;
  /** Seats the plan includes; -1 means unlimited (ENTERPRISE). */
  limit: number;
  /** Seats already taken, counted per `when` below. */
  used: number;
};

/**
 * Is there room for ONE more person in this organization?
 *
 * ── WHAT COUNTS AS A TAKEN SEAT, AND WHY IT DEPENDS ON THE MOMENT ──
 *  • 'invite'  → members ALREADY IN plus invites STILL OPEN (not accepted, not
 *    expired). Counting only members here would leave the limit trivially
 *    bypassable: send twenty invites in one sitting while under the cap and
 *    every one of them is accepted later, putting the organization far past a
 *    limit that was never checked again.
 *  • 'join' → members only. The invite being accepted is the seat about to be
 *    filled, so counting it as already taken would refuse the very last legal
 *    seat. This second check is not redundant with the first: between issuing
 *    an invite and someone clicking it the plan can be DOWNGRADED, or other
 *    invites can be accepted first, and neither of those re-runs the check
 *    that happened at invite time.
 *
 * ── RETURNS A RESULT, DOES NOT THROW ──
 * Same shape and same reason as requireActiveAccess above: the two callers
 * answer in two different response formats (settings/team/invite uses fail(),
 * invite/accept writes its own NextResponse.json), so the decision is handed
 * back and each route says it in its own voice. It deliberately does NOT reuse
 * assertWithinLimit, which throws: both call sites funnel their errors into
 * failFromError, and failFromError only recognises errors by `name`
 * ('NotAuthenticatedError', 'NoOrganizationError') — an Error carrying a `code`
 * property, which is what assertWithinLimit throws, would reach the customer as
 * a generic INTERNAL_ERROR 500. assertWithinLimit is left untouched and still
 * has no callers.
 *
 * ── AN ORGANIZATION ALREADY OVER THE LIMIT LOSES NOTHING ──
 * The test is "is there room for one MORE", never "is the current state legal".
 * An organization sitting at eight people on a five-seat plan keeps all eight,
 * keeps their access, and keeps every invite already accepted; it simply cannot
 * add a ninth. Nothing here removes or downgrades anyone.
 *
 * ── SEATS DEPEND ON THE ROLE ──
 * Seats are counted with countedSeats() (plans.ts): a viewer is free up to the
 * plan's `freeViewers`. So the check takes the role being added, and, for a
 * change that REPLACES someone rather than adding them — 'role' (a member's
 * role changes) or an invite re-sent with `replacingInviteId` — it compares
 * the seats before and after. A replacement that does not raise the count is
 * always allowed, even over the limit: re-sending an invite or demoting
 * someone never needs a free seat. Promoting a free viewer to editor does.
 */
export async function checkSeatAvailability(
  orgId: string,
  when: "invite" | "join" | "role",
  role: string,
  replacing: { inviteId?: string; membershipId?: string } = {},
): Promise<SeatCheck> {
  const sub = await getSubscription(orgId);
  const { users: limit, freeViewers } = PLANS[sub.plan].limits;

  if (limit === -1) {
    return { allowed: true, limit, used: 0 };
  }

  const members = await prisma.membership.findMany({
    where: { organizationId: orgId },
    select: { id: true, role: true },
  });
  const openInvites =
    when === "invite"
      ? await prisma.invite.findMany({
          where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true, role: true },
        })
      : [];

  const before = [...members.map((m) => m.role), ...openInvites.map((i) => i.role)];
  const kept = [
    ...members.filter((m) => m.id !== replacing.membershipId).map((m) => m.role),
    ...openInvites.filter((i) => i.id !== replacing.inviteId).map((i) => i.role),
  ];
  const after = [...kept, role];

  const used = countedSeats(before, freeViewers);
  const usedAfter = countedSeats(after, freeViewers);
  const replacesSomeone = kept.length < before.length;

  return {
    allowed: usedAfter <= limit || (replacesSomeone && usedAfter <= used),
    limit,
    used,
  };
}

export type OrganizationAllowance = {
  allowed: boolean;
  /** How many organizations the plan includes. -1 means unlimited. */
  limit: number;
  /** How many this account has CREATED — never how many it belongs to. */
  used: number;
};

/**
 * May this user create one more organization? (PLANS[...].limits.orgs)
 *
 * ── WHY IT COUNTS CREATIONS, NOT MEMBERSHIPS ──
 * Belonging to an organization and having opened one are different things, and
 * only the second one spends the account's allowance. Counting Membership rows
 * would refuse a consultant invited into three client companies the right to
 * open their own — the opposite of what the limit is for. So the count is on
 * Organization.createdByUserId, the column written by the one route that
 * creates an organization.
 *
 * ── ORGANIZATIONS CREATED BEFORE THAT COLUMN EXISTED ──
 * They carry NULL and are therefore NOT counted, so the limit applies from here
 * on: an account that already had a company when this shipped can open one more
 * before the limit starts to bite. That is deliberate. The alternative — reading
 * NULL plus an 'owner' membership as "probably created by this person" — would
 * guess, and it would guess against someone who was merely promoted to owner by
 * a colleague, locking them out of opening their own company. Between letting a
 * handful of existing accounts create one extra organization and blocking a real
 * person from a legitimate one, the founder's standing rule is not to invent a
 * value that is not in the database. Filling the column in for the existing rows
 * is a separate, deliberate operation, not something this check should fake.
 *
 * ── WHICH PLAN ──
 * Plans live on organizations, not on accounts, so "the user's plan" has to be
 * derived: this takes the most permissive limit among the organizations the user
 * created. Paying for ENTERPRISE in one of your own companies is what buys the
 * right to open more. A user who has created NONE is always allowed — no plan in
 * the catalogue includes fewer than one organization — and that case never
 * reaches a plan lookup at all.
 *
 * ── RETURNS A RESULT, DOES NOT THROW ──
 * Same reason as checkSeatAvailability above: its caller writes its own
 * NextResponse.json, so the decision is handed back rather than thrown.
 */
export async function checkOrganizationAllowance(
  userId: string,
): Promise<OrganizationAllowance> {
  const created = await prisma.organization.findMany({
    where: { createdByUserId: userId },
    select: { id: true },
  });
  const used = created.length;

  // No plan to read, and nothing to refuse: every plan includes at least one.
  if (used === 0) return { allowed: true, limit: 1, used: 0 };

  const plans = await Promise.all(created.map((o) => getSubscription(o.id)));
  let limit = 0;
  for (const sub of plans) {
    const orgs = PLANS[sub.plan].limits.orgs;
    if (orgs === -1) return { allowed: true, limit: -1, used };
    if (orgs > limit) limit = orgs;
  }

  return { allowed: used < limit, limit, used };
}
