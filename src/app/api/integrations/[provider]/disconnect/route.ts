import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/session";
import { requireManagerRole } from "@/lib/auth/require-role";
import { getIntegration } from "@/lib/integrations/registry";

export async function POST(_req: Request, props: { params: Promise<{ provider: string }> }) {
  const params = await props.params;
  const definition = getIntegration(params.provider);
  if (!definition) return fail("Unknown provider", 404);

  const authCtx = await getAuthContext();
  if (!authCtx) return fail("Unauthorized", 401);
  const denied = requireManagerRole(authCtx);
  if (denied) return denied;
  const { organizationId } = authCtx;
  const org = { id: organizationId, plan: 'PRO' as const };
  await prisma.integration.update({
    where: {
      organizationId_provider: {
        organizationId: org.id,
        provider: definition.id,
      },
    },
    data: { status: "DISCONNECTED", apiKey: null },
  });

  return ok({ disconnected: true });
}
