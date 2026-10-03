import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { getAuthContext } from "@/lib/session";
import { requireWritableOrg } from "@/lib/auth/require-writable";
import { requireOwnerRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { BILLING_SELECT, checkStoredBillingDetails } from "@/lib/billing/billing-details";
import { trialEligibility } from "@/lib/billing/trial-eligibility";
import { TRIAL_CREDITS, TRIAL_DAYS, planAmountCents, trialRuleText } from "@/lib/billing/trial-rule";

const Query = z.object({
  plan: z.enum(["PRO", "ADVANCED", "ENTERPRISE"]),
  cycle: z.enum(["monthly", "yearly"]),
  locale: z.enum(["it", "en"]).optional(),
});

/**
 * What the owner is about to accept, BEFORE entering the card: whether this
 * company may have the 7-day trial (VAT number and company; the card is checked
 * only after it has been entered) and the exact sentence of the box, built by
 * the same function that records it at checkout (src/lib/billing/trial-rule.ts).
 * Same guards as the checkout. Reads only.
 */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return fail("Unauthenticated", 401);
  const readOnly = requireWritableOrg(ctx.organizationId);
  if (readOnly) return readOnly;
  const denied = requireOwnerRole(ctx);
  if (denied) return denied;

  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return fail("Invalid request", 400);

  const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: BILLING_SELECT });
  const billing = org ? checkStoredBillingDetails(org) : null;
  if (!billing?.ok) return fail("BILLING_DETAILS_INCOMPLETE", 400);

  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { locale: true } });
  const locale = parsed.data.locale ?? (user?.locale === "en" ? "en" : "it");
  const eligibility = await trialEligibility({ organizationId: ctx.organizationId, vatNumber: billing.data.vatNumber });

  return ok({
    trialOffered: eligibility.eligible,
    // 'company' or 'vat': said BEFORE the payment, so the owner can pay at
    // once without a trial or give up.
    blockedBy: eligibility.blockedBy,
    ruleText: await trialRuleText({
      locale,
      plan: parsed.data.plan,
      cycle: parsed.data.cycle,
      trialOffered: eligibility.eligible,
    }),
    amountCents: planAmountCents(parsed.data.plan, parsed.data.cycle),
    trialDays: TRIAL_DAYS,
    trialCredits: TRIAL_CREDITS,
  });
}
