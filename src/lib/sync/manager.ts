import { prisma } from "@/lib/prisma";
import { stripeProvider } from "@/lib/sync/providers/stripe";
import { makeStubProvider } from "@/lib/sync/providers/stub";
import type { SyncProvider } from "@/lib/sync/types";

const providers: Record<string, SyncProvider> = {
  stripe: stripeProvider,
  quickbooks: makeStubProvider("quickbooks"),
  xero: makeStubProvider("xero"),
  hubspot: makeStubProvider("hubspot"),
  "google-analytics": makeStubProvider("google-analytics"),
  shopify: makeStubProvider("shopify"),
};

export function getProvider(id: string): SyncProvider | undefined {
  return providers[id];
}

export async function runSync(integrationId: string) {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });
  if (!integration) throw new Error("Integration not found");
  if (integration.status !== "CONNECTED") {
    throw new Error("Integration is not connected");
  }

  const provider = getProvider(integration.provider);
  if (!provider) throw new Error(`Unknown provider: ${integration.provider}`);

  const log = await prisma.syncLog.create({
    data: { integrationId: integration.id, status: "RUNNING" },
  });

  try {
    const result = await provider.sync(integration);
    const finishedAt = new Date();
    await prisma.$transaction([
      prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: "SUCCESS",
          recordsCount: result.recordsCount,
          finishedAt,
        },
      }),
      prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: finishedAt, status: "CONNECTED" },
      }),
    ]);
    return { logId: log.id, recordsCount: result.recordsCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.$transaction([
      prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: "ERROR",
          errorMessage: message,
          finishedAt: new Date(),
        },
      }),
      prisma.integration.update({
        where: { id: integration.id },
        data: { status: "ERROR" },
      }),
    ]);
    throw err;
  }
}
