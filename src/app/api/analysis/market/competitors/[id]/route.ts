import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/session";
import { requireManagerRole } from "@/lib/auth/require-role";
import { ok, fail } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().url().nullable().optional(),
  revenue: z.number().nonnegative().optional(),
  employees: z.number().int().nonnegative().optional(),
  marketSharePct: z.number().min(0).max(100).optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  pricePosition: z.number().min(0).max(100).optional(),
  qualityScore: z.number().min(0).max(100).optional(),
});

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const ctx = await getAuthContext();
    if (!ctx) return fail("Unauthorized", 401);
    const orgId = ctx.organizationId;
    const body = updateSchema.parse(await req.json());
    const competitor = await prisma.competitor.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!competitor) return fail("Competitor not found", 404);
    const { strengths, weaknesses, ...rest } = body;
    const updated = await prisma.competitor.update({
      where: { id: competitor.id },
      data: {
        ...rest,
        ...(strengths !== undefined ? { strengths: JSON.stringify(strengths) } : {}),
        ...(weaknesses !== undefined ? { weaknesses: JSON.stringify(weaknesses) } : {}),
      },
    });
    return ok(updated);
  } catch (e) {
    if (e instanceof z.ZodError) return fail(e.issues[0]?.message ?? "Invalid input");
    return fail((e as Error).message, 500);
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const ctx = await getAuthContext();
    if (!ctx) return fail("Unauthorized", 401);
    const denied = requireManagerRole(ctx);
    if (denied) return denied;
    const orgId = ctx.organizationId;
    const competitor = await prisma.competitor.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!competitor) return fail("Competitor not found", 404);
    await prisma.competitor.delete({ where: { id: competitor.id } });
    return ok({ id: competitor.id });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
