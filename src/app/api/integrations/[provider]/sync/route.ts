import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/session";
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireManagerRole } from "@/lib/auth/require-role";
import { requireIntegrationPlan } from "@/lib/billing/server-gate";
import { auditLog } from '@/lib/audit/log';
import { getIntegration } from "@/lib/integrations/registry";
import { runSync } from "@/lib/sync/manager";

export async function POST(_req: Request, props: { params: Promise<{ provider: string }> }) {
  const params = await props.params;
  const definition = getIntegration(params.provider);
  if (!definition) return fail("Unknown provider", 404);

  const authCtx = await getAuthContext();
  if (!authCtx) return fail("Unauthorized", 401);
  // Demo organization: read-only. See requireWritableOrg.
  const readOnly = requireWritableOrg(authCtx.organizationId);
  if (readOnly) return readOnly;
  const denied = requireManagerRole(authCtx);
  if (denied) return denied;
  const { organizationId } = authCtx;
  // Plan gate, same source as the interface (registry requiredPlan +
  // planMeets). Before the integration lookup: a plan that does not include
  // this provider is refused whether or not a row happens to exist.
  const lockedByPlan = await requireIntegrationPlan(organizationId, definition.requiredPlan);
  if (lockedByPlan) return lockedByPlan;
  // `plan: 'PRO' as const` used to sit here — a hardcoded plan that nothing
  // read. Removed with the same reasoning applied to the sibling routes: a
  // fabricated plan one line from a real gate is how it gets into one.
  const org = { id: organizationId };
  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: org.id,
        provider: definition.id,
      },
    },
    select: { id: true },
  });
  if (!integration) return fail("Integration not connected", 400);

  try {
    const result = await runSync(integration.id);
    await auditLog({
      action: 'integration.sync',
      userId: authCtx.userId,
      organizationId,
      targetType: 'integration',
      targetId: definition.id,
      req: _req,
    });
    return ok(result);
  } catch (err) {
    // A failed sync is worth a trail row too — it is how a broken integration
    // shows up later. The message is ours, not user data.
    await auditLog({
      action: 'integration.sync',
      userId: authCtx.userId,
      organizationId,
      targetType: 'integration',
      targetId: definition.id,
      outcome: 'failure',
      req: _req,
    });
    return fail(err instanceof Error ? err.message : "Sync failed", 500);
  }
}
