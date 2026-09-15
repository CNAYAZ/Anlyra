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
  // ── NO PLAN GATE HERE, AND IT IS DELIBERATE ──
  // Its three siblings (connect, sync, frequency) now refuse a provider the
  // org's plan does not include. This one does not, because it is the only one
  // that TAKES access away rather than granting it. Gate it and a customer who
  // downgrades while a provider is connected can never switch that connection
  // off: the interface hides the button on a locked card and the route would
  // refuse the manual call, leaving a connection they no longer pay for and
  // cannot remove. Letting someone turn off what they are no longer entitled to
  // is not an escalation.
  // This does not put the interface and the server at odds in the direction
  // that hurts: the failure mode worth preventing is an ENABLED button the
  // route then refuses, and here the button is hidden while the route allows —
  // nothing a customer can see promises something that fails.
  // `plan: 'PRO' as const` used to sit here — a hardcoded plan nothing read.
  const org = { id: organizationId };
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
