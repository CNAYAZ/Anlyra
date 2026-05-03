import { prisma } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    const [profile, competitors, swot] = await Promise.all([
      prisma.marketProfile.findUnique({ where: { organizationId: orgId } }),
      prisma.competitor.findMany({
        where: { organizationId: orgId },
        orderBy: { marketSharePct: "desc" },
      }),
      prisma.swotItem.findMany({
        where: { organizationId: orgId },
        orderBy: [{ weight: "desc" }, { createdAt: "asc" }],
      }),
    ]);
    if (!profile) return fail("Market profile not found", 404);

    return ok({ profile, competitors, swot });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
