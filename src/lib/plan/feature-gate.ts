type Plan = "FREEMIUM" | "STARTER" | "PRO" | "ENTERPRISE";

const PLAN_RANK: Record<Plan, number> = {
  FREEMIUM: 0,
  STARTER: 1,
  PRO: 2,
  ENTERPRISE: 3,
};

export type RequiredPlan = "STARTER" | "PRO" | "ENTERPRISE";

export function planMeets(current: Plan, required: RequiredPlan): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[required];
}

export function lockedReason(
  current: Plan,
  required: RequiredPlan,
): string | null {
  if (planMeets(current, required)) return null;
  return required;
}
