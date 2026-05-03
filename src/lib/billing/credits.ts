import { addCreditEntry, getCreditBalance } from "./repository";

export async function consumeCredits(orgId: string, amount: number, reason: "ai_call" = "ai_call") {
  if (amount <= 0) return;
  const balance = await getCreditBalance(orgId);
  if (balance < amount) {
    throw Object.assign(new Error("Insufficient AI credits"), { code: "NO_CREDITS" as const });
  }
  await addCreditEntry({
    id: `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orgId,
    delta: -amount,
    reason,
    createdAt: new Date(),
  });
}

export async function grantMonthlyCredits(orgId: string, amount: number) {
  if (amount <= 0) return;
  await addCreditEntry({
    id: `gr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orgId,
    delta: amount,
    reason: "monthly_grant",
    createdAt: new Date(),
  });
}
