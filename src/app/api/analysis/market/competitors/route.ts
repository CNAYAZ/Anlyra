import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    const [profile, competitors] = await Promise.all([
      prisma.marketProfile.findUnique({ where: { organizationId: orgId } }),
      prisma.competitor.findMany({
        where: { organizationId: orgId },
        orderBy: { marketSharePct: "desc" },
      }),
    ]);
    if (!profile) return fail("Market profile not found", 404);

    return ok({
      profile: {
        marketSharePct: profile.marketSharePct,
        scoreRevenue: profile.scoreRevenue,
        scoreTeam: profile.scoreTeam,
        scoreShare: profile.scoreShare,
        scorePricing: profile.scorePricing,
        scoreProduct: profile.scoreProduct,
        scoreBrand: profile.scoreBrand,
        pricePosition: profile.pricePosition,
        qualityScore: profile.qualityScore,
      },
      competitors,
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().nullable().optional(),
  revenue: z.number().nonnegative(),
  employees: z.number().int().nonnegative(),
  marketSharePct: z.number().min(0).max(100),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  pricePosition: z.number().min(0).max(100).default(50),
  qualityScore: z.number().min(0).max(100).default(50),
});

export async function POST(req: Request) {
  try {
    const orgId = await getCurrentOrgId();
    const body = createSchema.parse(await req.json());
    const created = await prisma.competitor.create({
      data: { ...body, organizationId: orgId },
    });
    return ok(created);
  } catch (e) {
    if (e instanceof z.ZodError) return fail(e.issues[0]?.message ?? "Invalid input");
    return fail((e as Error).message, 500);
  }
}
