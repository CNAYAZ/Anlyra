import { PLANS, type PlanId, isUnlimited } from "./plans";

export interface UsageSnapshot {
  imports: number;
  aiCredits: number;
  users: number;
  customDashboards: number;
}

export interface UsageMetric {
  key: keyof UsageSnapshot;
  used: number;
  limit: number;
  percent: number;
  unlimited: boolean;
}

export function buildUsageMetrics(plan: PlanId, snapshot: UsageSnapshot): UsageMetric[] {
  const limits = PLANS[plan].limits;

  const metrics: Array<[keyof UsageSnapshot, number, number]> = [
    ["imports", snapshot.imports, limits.imports],
    ["aiCredits", snapshot.aiCredits, limits.aiCredits],
    ["users", snapshot.users, limits.users],
    ["customDashboards", snapshot.customDashboards, limits.customDashboards],
  ];

  return metrics.map(([key, used, limit]) => {
    const unlimited = isUnlimited(limit);
    const percent = unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
    return { key, used, limit, percent, unlimited };
  });
}
