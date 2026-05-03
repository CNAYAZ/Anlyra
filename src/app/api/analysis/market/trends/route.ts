import { prisma } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    const trends = await prisma.marketTrend.findMany({
      where: { organizationId: orgId },
      orderBy: { period: "asc" },
    });
    return ok({ trends });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
