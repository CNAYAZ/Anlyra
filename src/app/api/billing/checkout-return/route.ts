import { ok, fail } from "@/lib/api/response";
import { getAuthContext } from "@/lib/session";
import { getSubscription } from "@/lib/billing/repository";
import { prisma } from "@/lib/prisma";

/**
 * What happened to the subscription checkout the customer has just come back
 * from — polled by CheckoutReturnNotice until the webhook has landed. Read only.
 *  • subscription: whether a Stripe subscription is now recorded;
 *  • trialDenied: the trial did not start because the card (or the VAT number)
 *    had already had one, and the first period was charged at once — the
 *    on-screen notice of the founder's rule. Read from the audit row written by
 *    src/lib/billing/trial-start.ts for THIS subscription;
 *  • trialRecorded: the trial of THIS subscription is in the register, i.e. it
 *    really started (a "trialing" status alone is written a moment BEFORE the
 *    card check, so it does not say yet whether the trial stays).
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return fail("Unauthenticated", 401);

  const sub = await getSubscription(ctx.organizationId);
  const denied = sub.stripeSubscriptionId
    ? await prisma.auditLog.findFirst({
        where: {
          action: "billing.trial_denied",
          organizationId: ctx.organizationId,
          targetId: sub.stripeSubscriptionId,
        },
        select: { metadata: true },
      })
    : null;
  const trialRecorded = sub.stripeSubscriptionId
    ? (await prisma.trialClaim.count({ where: { stripeSubscriptionId: sub.stripeSubscriptionId } })) > 0
    : false;
  let trialDenied: string | null = null;
  if (denied) {
    try {
      trialDenied = (JSON.parse(denied.metadata ?? "{}") as { reason?: string }).reason ?? "card";
    } catch {
      trialDenied = "card";
    }
  }

  return ok({
    subscription: sub.stripeSubscriptionId !== null,
    status: sub.status,
    periodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    trialDenied,
    trialRecorded,
  });
}
