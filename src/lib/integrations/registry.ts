import type { RequiredPlan } from "@/lib/plan/feature-gate";

export type IntegrationCategory = "finance" | "crm" | "analytics" | "ecommerce";

export interface IntegrationDefinition {
  id: string;
  name: string;
  category: IntegrationCategory;
  requiredPlan: RequiredPlan;
  logo: string;
  descriptionKey: string;
  docsUrl?: string;
}

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: "stripe",
    name: "Stripe",
    category: "finance",
    requiredPlan: "PRO",
    logo: "/integrations/stripe.svg",
    descriptionKey: "stripe.description",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    category: "finance",
    requiredPlan: "PRO",
    logo: "/integrations/quickbooks.svg",
    descriptionKey: "quickbooks.description",
  },
  {
    id: "xero",
    name: "Xero",
    category: "finance",
    requiredPlan: "PRO",
    logo: "/integrations/xero.svg",
    descriptionKey: "xero.description",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "crm",
    requiredPlan: "ENTERPRISE",
    logo: "/integrations/hubspot.svg",
    descriptionKey: "hubspot.description",
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    category: "analytics",
    requiredPlan: "ENTERPRISE",
    logo: "/integrations/ga.svg",
    descriptionKey: "googleAnalytics.description",
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "ecommerce",
    requiredPlan: "ENTERPRISE",
    logo: "/integrations/shopify.svg",
    descriptionKey: "shopify.description",
  },
];

export function getIntegration(id: string): IntegrationDefinition | undefined {
  return INTEGRATIONS.find((i) => i.id === id);
}
