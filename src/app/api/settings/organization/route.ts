import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  industry: z.string().min(1).optional(),
  employees: z.number().int().nonnegative().optional(),
  country: z.string().length(2).optional(),
  currency: z.string().min(3).max(3).optional(),
});

export async function GET() {
  try {
    const { organizationId } = await getCurrentContext();
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return fail('NOT_FOUND', 404);
    return ok(org);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { organizationId } = await getCurrentContext();
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'INVALID', 400);
    const updated = await prisma.organization.update({ where: { id: organizationId }, data: parsed.data });
    return ok(updated);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
