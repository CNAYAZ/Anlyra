import {
  PLANS,
  type FeatureKey,
  type IntegrationKey,
  type PlanId,
  planHasFeature,
  planHasIntegration,
} from "./plans";
import { getSubscription, type Subscription } from "./repository";
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
