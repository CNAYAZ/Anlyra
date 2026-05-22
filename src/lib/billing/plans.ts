export type PlanId = "PRO" | "ADVANCED" | "ENTERPRISE";

export type FeatureKey =
  | "financial_basic"
  | "financial_full"
  | "market"
  | "operations"
  | "ai_chat"
  | "ai_insights"
  | "ai_forecast"
  | "ai_benchmark"
  | "ai_alerts"
  | "ai_agent"
  | "charts_interactive"
  | "report_basic"
  | "report_full"
  | "share_reports"
  | "collaboration"
  | "audit_log"
  | "two_factor"
  | "white_label";

export type IntegrationKey = "stripe" | "quickbooks" | "xero" | "salesforce" | "hubspot" | "sap";

export interface PlanLimits {
  users: number;
  orgs: number;
  imports: number;
  aiCredits: number;
  customDashboards: number;
}

export interface PlanPricing {
  monthlyCents: number;
  yearlyCents: number;
}

export interface Plan {
  id: PlanId;
  nameKey: string;
  taglineKey: string;
  pricing: PlanPricing;
  limits: PlanLimits;
  features: FeatureKey[];
  integrations: IntegrationKey[];
  highlight?: boolean;
  contact?: boolean;
}

export const ALL_FEATURES: FeatureKey[] = [
  "financial_basic",
  "financial_full",
  "market",
  "operations",
  "ai_chat",
  "ai_insights",
  "ai_forecast",
  "ai_benchmark",
  "ai_alerts",
  "ai_agent",
  "charts_interactive",
  "report_basic",
  "report_full",
  "share_reports",
  "collaboration",
  "audit_log",
  "two_factor",
  "white_label",
];

export const ALL_INTEGRATIONS: IntegrationKey[] = [
  "stripe",
  "quickbooks",
  "xero",
  "salesforce",
  "hubspot",
  "sap",
];

export const PLANS: Record<PlanId, Plan> = {
  PRO: {
    id: "PRO",
    nameKey: "billing.plans.pro.name",
    taglineKey: "billing.plans.pro.tagline",
    pricing: { monthlyCents: 4900, yearlyCents: 49000 },
    limits: { users: 5, orgs: 1, imports: -1, aiCredits: 200, customDashboards: -1 },
    features: [
      "financial_basic",
      "financial_full",
      "market",
      "operations",
      "ai_chat",
      "ai_insights",
      "ai_forecast",
      "ai_benchmark",
      "ai_alerts",
      "charts_interactive",
      "report_basic",
      "report_full",
      "share_reports",
    ],
    integrations: ["stripe", "quickbooks", "xero"],
  },
  ADVANCED: {
    id: "ADVANCED",
    nameKey: "billing.plans.advanced.name",
    taglineKey: "billing.plans.advanced.tagline",
    pricing: { monthlyCents: 14900, yearlyCents: 149000 },
    limits: { users: 15, orgs: 1, imports: -1, aiCredits: 700, customDashboards: -1 },
    features: [
      "financial_basic",
      "financial_full",
      "market",
      "operations",
      "ai_chat",
      "ai_insights",
      "ai_forecast",
      "ai_benchmark",
      "ai_alerts",
      "charts_interactive",
      "report_basic",
      "report_full",
      "share_reports",
      "collaboration",
    ],
    integrations: ["stripe", "quickbooks", "xero", "salesforce", "hubspot"],
    highlight: true,
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    nameKey: "billing.plans.enterprise.name",
    taglineKey: "billing.plans.enterprise.tagline",
    pricing: { monthlyCents: 0, yearlyCents: 0 },
    limits: { users: -1, orgs: -1, imports: -1, aiCredits: -1, customDashboards: -1 },
    features: ALL_FEATURES,
    integrations: ALL_INTEGRATIONS,
    contact: true,
  },
};

export const PLAN_ORDER: PlanId[] = ["PRO", "ADVANCED", "ENTERPRISE"];

export interface CreditPack {
  id: "credits_50" | "credits_200" | "credits_500";
  credits: number;
  priceCents: number;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "credits_50", credits: 50, priceCents: 900 },
  { id: "credits_200", credits: 200, priceCents: 2900 },
  { id: "credits_500", credits: 500, priceCents: 5900 },
];

export function planHasFeature(planId: PlanId, feature: FeatureKey): boolean {
  return PLANS[planId].features.includes(feature);
}

export function planHasIntegration(planId: PlanId, integration: IntegrationKey): boolean {
  return PLANS[planId].integrations.includes(integration);
}

export function getMinPlanForFeature(feature: FeatureKey): PlanId | null {
  for (const id of PLAN_ORDER) {
    if (planHasFeature(id, feature)) return id;
  }
  return null;
}

export function getMinPlanForIntegration(integration: IntegrationKey): PlanId | null {
  for (const id of PLAN_ORDER) {
    if (planHasIntegration(id, integration)) return id;
  }
  return null;
}

export function isHigherOrEqualPlan(a: PlanId, b: PlanId): boolean {
  return PLAN_ORDER.indexOf(a) >= PLAN_ORDER.indexOf(b);
}

export function yearlySavingsPct(plan: Plan): number {
  if (plan.pricing.monthlyCents === 0) return 0;
  const monthlyAnnual = plan.pricing.monthlyCents * 12;
  if (monthlyAnnual === 0) return 0;
  return Math.round(((monthlyAnnual - plan.pricing.yearlyCents) / monthlyAnnual) * 100);
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}
