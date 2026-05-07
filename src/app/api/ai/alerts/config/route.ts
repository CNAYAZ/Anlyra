import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

const ConfigSchema = z.object({
  configs: z.array(
    z.object({
      metric: z.string().min(1).max(50),
      enabled: z.boolean(),
      threshold: z.number(),
      comparator: z.enum(['gt', 'lt', 'eq']).default('gt'),
    }),
  ),
});

export async function GET() {
  try {
    const { organizationId } = await getCurrentContext();
    const configs = await prisma.aiAlertConfig.findMany({ where: { organizationId } });
    return ok({ configs });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function PUT(req: Request) {
  try {
    const { organizationId } = await getCurrentContext();
    const json = await req.json().catch(() => null);
    const parsed = ConfigSchema.safeParse(json);
    if (!parsed.success) return fail('INVALID_INPUT', 400);

    for (const c of parsed.data.configs) {
      await prisma.aiAlertConfig.upsert({
        where: { organizationId_metric: { organizationId, metric: c.metric } },
        update: { enabled: c.enabled, threshold: c.threshold, comparator: c.comparator },
        create: {
          organizationId,
          metric: c.metric,
          enabled: c.enabled,
          threshold: c.threshold,
          comparator: c.comparator,
        },
      });
    }

    const configs = await prisma.aiAlertConfig.findMany({ where: { organizationId } });
    return ok({ configs });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
