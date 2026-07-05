import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { runAllRules } from '@/lib/alerts/rules';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;
    const triggered = await runAllRules(organizationId);

    const upserted: string[] = [];
    for (const rule of triggered) {
      await prisma.alert.upsert({
        where: { organizationId_source: { organizationId, source: rule.source } },
        create: {
          organizationId,
          severity: rule.severity,
          status: 'NEW',
          title: rule.title,
          description: rule.description,
          source: rule.source,
          recommendation: rule.recommendation,
        },
        update: {
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          recommendation: rule.recommendation,
          status: { set: 'NEW' },
        },
      });
      upserted.push(rule.source);
    }

    return ok({ triggered: upserted.length, sources: upserted });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
