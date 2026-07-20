import {
  PLANS,
  type FeatureKey,
  type IntegrationKey,
  type PlanId,
  planHasFeature,
  planHasIntegration,
} from "./plans";
import { getSubscription, type Subscription } from "./repository";

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
