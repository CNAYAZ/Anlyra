type Plan = "PRO" | "ADVANCED" | "ENTERPRISE";

const PLAN_RANK: Record<Plan, number> = {
  PRO: 0,
  ADVANCED: 1,
  ENTERPRISE: 2,
};

export type RequiredPlan = "PRO" | "ADVANCED" | "ENTERPRISE";

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
