import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireEditorRole } from '@/lib/auth/require-role';
import { runAllRules } from '@/lib/alerts/rules';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;
    // Viewer: read-only role — see requireEditorRole.
    const viewerOnly = requireEditorRole(authCtx);
    if (viewerOnly) return viewerOnly;
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
    // Was fail((e as Error).message, 500): forwarded the raw error text to
    // the client and always answered 500, even for the getAuthContext-based
    // 401 case above having already returned. failFromError never leaks the
    // real message — only the server log gets it.
    return failFromError(e);
  }
}
