import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getCurrentContext } from "@/lib/session";
import { getIntegration } from "@/lib/integrations/registry";

export async function GET(_req: Request, props: { params: Promise<{ provider: string }> }) {
  const params = await props.params;
  const definition = getIntegration(params.provider);
  if (!definition) return fail("Unknown provider", 404);

  // No plan is resolved here on purpose. This route reports CONNECTION status,
  // it does not gate on the plan — and it used to carry a `plan: 'PRO' as const`
  // literal that nothing read. A hardcoded plan sitting one line away from a
  // gate is how it ends up inside one, so it is gone rather than left to be
  // copied. If this route ever needs to gate, the plan comes from
  // getBillingState(organizationId), never from a literal.
  const { organizationId } = await getCurrentContext();
  const org = { id: organizationId };
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
