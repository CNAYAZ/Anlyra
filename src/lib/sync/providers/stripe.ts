import { prisma } from "@/lib/prisma";
import type { SyncProvider, SyncResult } from "@/lib/sync/types";
import type { Integration } from "@prisma/client";

const SAMPLE_DESCRIPTIONS = [
  "Subscription payment",
  "One-time charge",
  "Refund",
  "Invoice payment",
  "Plan upgrade",
];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export const stripeProvider: SyncProvider = {
  id: "stripe",
  async sync(integration: Integration): Promise<SyncResult> {
    const count = Math.floor(randomBetween(8, 20));
    const now = Date.now();
    const records = Array.from({ length: count }, (_, i) => {
      const occurredAt = new Date(now - i * 1000 * 60 * 60 * randomBetween(1, 8));
      const amount = Number(randomBetween(15, 1200).toFixed(2));
      const isRefund = Math.random() < 0.1;
      return {
        organizationId: integration.organizationId,
        source: "stripe",
        type: isRefund ? "refund" : "payment",
        amount: isRefund ? -amount : amount,
        currency: "EUR",
        description: pick(SAMPLE_DESCRIPTIONS),
        externalId: `pi_sim_${integration.id.slice(0, 6)}_${now}_${i}`,
        occurredAt,
      };
    });

    await prisma.financialRecord.createMany({ data: records });

    return { recordsCount: records.length };
  },
};
