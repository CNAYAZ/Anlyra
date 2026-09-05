import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext, getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { hasControlChars, NO_CONTROL_CHARS_MESSAGE } from '@/lib/validation/display-name';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().min(1).max(100).refine((v) => !hasControlChars(v), NO_CONTROL_CHARS_MESSAGE).optional(),
  locale: z.enum(['it', 'en']).optional(),
});

export async function GET() {
  try {
    const { userId } = await getCurrentContext();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return fail('NOT_FOUND', 404);
    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      locale: user.locale,
      image: user.image,
      createdAt: user.createdAt,
    });
  } catch (e) {
    return failFromError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;
    const { userId } = authCtx;
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'INVALID', 400);
    const updated = await prisma.user.update({ where: { id: userId }, data: parsed.data });
    return ok({ id: updated.id, name: updated.name, locale: updated.locale });
  } catch (e) {
    return failFromError(e);
  }
}
