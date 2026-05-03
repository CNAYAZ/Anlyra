export type Plan = 'free' | 'starter' | 'pro' | 'enterprise';

export interface PlanLimits {
  maxUsers: number;
  maxOrganizations: number;
  importsPerMonth: number;
  aiCredits: number;
  publicSharing: boolean;
  scheduledReports: boolean;
  customReports: boolean;
  aiAgent: boolean;
  realtimeCollab: boolean;
  auditLog: boolean;
  twoFactor: boolean;
  integrations: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxUsers: 1,
    maxOrganizations: 1,
    importsPerMonth: 2,
    aiCredits: 3,
    publicSharing: false,
    scheduledReports: false,
    customReports: false,
    aiAgent: false,
    realtimeCollab: false,
    auditLog: false,
    twoFactor: false,
    integrations: false,
  },
  starter: {
    maxUsers: 1,
    maxOrganizations: 1,
    importsPerMonth: 5,
    aiCredits: 5,
    publicSharing: false,
    scheduledReports: false,
    customReports: false,
    aiAgent: false,
    realtimeCollab: false,
    auditLog: false,
    twoFactor: false,
    integrations: false,
  },
  pro: {
    maxUsers: 10,
    maxOrganizations: 5,
    importsPerMonth: -1,
    aiCredits: 100,
    publicSharing: true,
    scheduledReports: true,
    customReports: true,
    aiAgent: false,
    realtimeCollab: false,
    auditLog: false,
    twoFactor: false,
    integrations: true,
  },
  enterprise: {
    maxUsers: -1,
    maxOrganizations: -1,
    importsPerMonth: -1,
    aiCredits: 500,
    publicSharing: true,
    scheduledReports: true,
    customReports: true,
    aiAgent: true,
    realtimeCollab: true,
    auditLog: true,
    twoFactor: true,
    integrations: true,
  },
};

export function hasFeature(plan: Plan, feature: keyof PlanLimits): boolean {
  const value = PLAN_LIMITS[plan][feature];
  return typeof value === 'boolean' ? value : value !== 0;
}
