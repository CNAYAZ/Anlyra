import type { PlanId } from "@/lib/billing/plans";

export type BillingCycle = "monthly" | "yearly";

export function getStripePriceId(plan: PlanId, cycle: BillingCycle): string | null {
  if (plan === "FREE") return null;
  const map: Record<Exclude<PlanId, "FREE">, Record<BillingCycle, string | undefined>> = {
    STARTER: {
      monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
      yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
    },
    PRO: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
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
