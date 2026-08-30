import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/session";
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireManagerRole } from "@/lib/auth/require-role";
import { auditLog } from '@/lib/audit/log';
import { getIntegration } from "@/lib/integrations/registry";

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
  const org = { id: organizationId, plan: 'PRO' as const };
  await prisma.integration.update({
    where: {
      organizationId_provider: {
        organizationId: org.id,
        provider: definition.id,
      },
    },
    data: { status: "DISCONNECTED", apiKey: null },
  });

  await auditLog({
    action: 'integration.disconnect',
    userId: authCtx.userId,
    organizationId: authCtx.organizationId,
    targetType: 'integration',
    targetId: params.provider,
    req: _req,
  });
  return ok({ disconnected: true });
}
