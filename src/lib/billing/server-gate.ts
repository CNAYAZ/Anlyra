import {
  PLANS,
  type FeatureKey,
  type IntegrationKey,
  type PlanId,
  planHasFeature,
  planHasIntegration,
} from "./plans";
import { getSubscription } from "./repository";

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
  metric: keyof (typeof PLANS)["FREE"]["limits"],
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
