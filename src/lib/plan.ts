export type Plan = 'free' | 'starter' | 'pro' | 'enterprise';

export interface PlanLimits {
  customDashboards: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { customDashboards: 0 },
  starter: { customDashboards: 0 },
  pro: { customDashboards: 5 },
  enterprise: { customDashboards: Number.POSITIVE_INFINITY },
};

export function dashboardLimit(plan: Plan): number {
  return PLAN_LIMITS[plan].customDashboards;
}
