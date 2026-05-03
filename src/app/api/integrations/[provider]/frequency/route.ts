import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/session";
import { getIntegration } from "@/lib/integrations/registry";

const Body = z.object({ frequency: z.enum(["H6", "H12", "H24"]) });

export async function POST(
  req: Request,
  { params }: { params: { provider: string } },
) {
  const definition = getIntegration(params.provider);
  if (!definition) return fail("Unknown provider", 404);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid frequency", 400);

  const org = await getCurrentOrganization();
  const integration = await prisma.integration.update({
    where: {
      organizationId_provider: {
        organizationId: org.id,
        provider: definition.id,
      },
    },
    data: { frequency: parsed.data.frequency },
    select: { frequency: true },
  });

  return ok(integration);
}
