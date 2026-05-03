import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/session";
import { getIntegration } from "@/lib/integrations/registry";

export async function POST(
  _req: Request,
  { params }: { params: { provider: string } },
) {
  const definition = getIntegration(params.provider);
  if (!definition) return fail("Unknown provider", 404);

  const org = await getCurrentOrganization();
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
