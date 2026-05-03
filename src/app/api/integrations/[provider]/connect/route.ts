import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/session";
import { getIntegration } from "@/lib/integrations/registry";
import { planMeets } from "@/lib/plan/feature-gate";

const Body = z.object({ apiKey: z.string().min(4) });

export async function POST(
  req: Request,
  { params }: { params: { provider: string } },
) {
  const definition = getIntegration(params.provider);
  if (!definition) return fail("Unknown provider", 404);

  const org = await getCurrentOrganization();
  if (!planMeets(org.plan, definition.requiredPlan)) {
    return fail(`Requires plan ${definition.requiredPlan}`, 403);
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid request body", 400);

  const integration = await prisma.integration.upsert({
    where: {
      organizationId_provider: {
        organizationId: org.id,
        provider: definition.id,
      },
    },
    create: {
      organizationId: org.id,
      provider: definition.id,
      status: "CONNECTED",
      apiKey: parsed.data.apiKey,
    },
    update: {
      status: "CONNECTED",
      apiKey: parsed.data.apiKey,
    },
    select: { id: true, status: true, provider: true },
  });

  return ok(integration);
}
