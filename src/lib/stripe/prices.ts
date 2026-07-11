import type { PlanId } from "@/lib/billing/plans";

export type BillingCycle = "monthly" | "yearly";

export function getStripePriceId(plan: PlanId, cycle: BillingCycle): string | null {
  const map: Record<PlanId, Record<BillingCycle, string | undefined>> = {
    PRO: {
      // STRIPE_PRICE_PRO is the flat single-price env used for the test-mode PRO
      // checkout; the per-cycle vars take precedence when configured later.
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? process.env.STRIPE_PRICE_PRO,
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? process.env.STRIPE_PRICE_PRO,
    },
    ADVANCED: {
      monthly: process.env.STRIPE_PRICE_ADVANCED_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ADVANCED_YEARLY,
    },
    ENTERPRISE: {
      monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    },
  };
  return map[plan][cycle] ?? null;
}

export function getCreditPackPriceId(packId: string): string | null {
  const map: Record<string, string | undefined> = {
    credits_50: process.env.STRIPE_PRICE_CREDITS_50,
    credits_200: process.env.STRIPE_PRICE_CREDITS_200,
    credits_500: process.env.STRIPE_PRICE_CREDITS_500,
  };
  return map[packId] ?? null;
}
