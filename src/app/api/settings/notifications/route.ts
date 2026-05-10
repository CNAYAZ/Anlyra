import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHANNELS = ['email', 'inapp'] as const;
const CATEGORIES = ['alerts', 'reports', 'billing', 'system'] as const;

const patchSchema = z.object({
  channel: z.enum(CHANNELS),
  category: z.enum(CATEGORIES),
  enabled: z.boolean(),
});

export async function GET() {
  try {
    const { userId, organizationId } = await getCurrentContext();
    const prefs = await prisma.notificationPref_b8.findMany({
      where: { userId, organizationId },
    });
    // Build dense matrix with defaults
    const map = new Map(prefs.map((p) => [`${p.channel}:${p.category}`, p.enabled]));
    const dense = CHANNELS.flatMap((channel) =>
      CATEGORIES.map((category) => ({
        channel,
        category,
        enabled: map.get(`${channel}:${category}`) ?? true,
      })),
    );
    return ok({ preferences: dense });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, organizationId } = await getCurrentContext();
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'INVALID', 400);
    const { channel, category, enabled } = parsed.data;
    const upserted = await prisma.notificationPref_b8.upsert({
      where: {
        userId_organizationId_channel_category: { userId, organizationId, channel, category },
      },
      update: { enabled },
      create: { userId, organizationId, channel, category, enabled },
    });
    return ok(upserted);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
