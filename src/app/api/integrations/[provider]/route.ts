import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getCurrentContext } from "@/lib/session";
import { getIntegration } from "@/lib/integrations/registry";

export async function GET(
  _req: Request,
  { params }: { params: { provider: string } },
) {
  const definition = getIntegration(params.provider);
  if (!definition) return fail("Unknown provider", 404);

  const { organizationId } = await getCurrentContext();
  const org = { id: organizationId, plan: 'PRO' as const };
  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: org.id,
        provider: definition.id,
      },
    },
    include: {
      syncLogs: { orderBy: { startedAt: "desc" }, take: 10 },
    },
  });

  return ok({
    provider: definition.id,
    status: integration?.status ?? "DISCONNECTED",
    frequency: integration?.frequency ?? "H24",
    lastSyncAt: integration?.lastSyncAt ?? null,
    logs: integration?.syncLogs ?? [],
  });
}
