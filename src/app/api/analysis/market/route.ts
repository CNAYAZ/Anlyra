import { prisma } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    const profile = await prisma.marketProfile.findUnique({
      where: { organizationId: orgId },
    });
    if (!profile) return fail("Market profile not found", 404);

    const competitorCount = await prisma.competitor.count({
      where: { organizationId: orgId },
    });

    return ok({
      marketSharePct: profile.marketSharePct,
      tam: profile.tam,
      sam: profile.sam,
      som: profile.som,
      growthPct: profile.growthPct,
      overview: profile.overview,
      competitorCount,
      updatedAt: profile.updatedAt,
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
