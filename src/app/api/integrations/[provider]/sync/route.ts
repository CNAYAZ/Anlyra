import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/session";
import { requireManagerRole } from "@/lib/auth/require-role";
import { getIntegration } from "@/lib/integrations/registry";
import { runSync } from "@/lib/sync/manager";

export async function POST(
  _req: Request,
  { params }: { params: { provider: string } },
) {
  const definition = getIntegration(params.provider);
  if (!definition) return fail("Unknown provider", 404);

  const authCtx = await getAuthContext();
  if (!authCtx) return fail("Unauthorized", 401);
  const denied = requireManagerRole(authCtx);
  if (denied) return denied;
  const { organizationId } = authCtx;
  const org = { id: organizationId, plan: 'PRO' as const };
  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: org.id,
        provider: definition.id,
      },
    },
    select: { id: true },
  });
  if (!integration) return fail("Integration not connected", 400);

  try {
    const result = await runSync(integration.id);
    return ok(result);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Sync failed", 500);
  }
}
