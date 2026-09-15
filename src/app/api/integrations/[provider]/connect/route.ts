import { fail } from "@/lib/api/response";
import { getAuthContext } from "@/lib/session";
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireManagerRole } from "@/lib/auth/require-role";
import { requireIntegrationPlan } from "@/lib/billing/server-gate";
import { getIntegration } from "@/lib/integrations/registry";

// Data-sync integrations are NOT available yet. This endpoint previously faked a
// connection: it accepted ANY string >= 4 chars as an "API key", stored it in
// CLEARTEXT, marked the integration CONNECTED and forced the org plan to 'PRO'
// to bypass the feature gate — while none of the 6 providers actually connect.
// Until a real provider integration exists it connects NOTHING: no credential is
// stored, the CONNECTED status is never set, and the organization plan is never
// touched. It fails honestly, like every other unimplemented provider.
//
// NOTE: this is the DATA-SYNC integration, unrelated to the real Stripe BILLING
// under /api/billing/*, /api/webhooks/stripe and src/lib/billing/* — do not merge.
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
  // Plan gate, from the SAME source the interface uses (the registry's
  // requiredPlan through planMeets) — see requireIntegrationPlan. Checked
  // BEFORE the 503 below on purpose: "your plan does not include this" is the
  // true and permanent answer for this org, while "not available yet" is a
  // temporary state of the product. Telling a PRO customer to come back later
  // for an ENTERPRISE integration would be a promise we do not intend to keep.
  const lockedByPlan = await requireIntegrationPlan(authCtx.organizationId, definition.requiredPlan);
  if (lockedByPlan) return lockedByPlan;

  return fail("Integration not available yet", 503);
}
