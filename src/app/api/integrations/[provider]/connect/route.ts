import { fail } from "@/lib/api/response";
import { getAuthContext } from "@/lib/session";
import { requireManagerRole } from "@/lib/auth/require-role";
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
export async function POST(
  _req: Request,
  { params }: { params: { provider: string } },
) {
  const definition = getIntegration(params.provider);
  if (!definition) return fail("Unknown provider", 404);

  const authCtx = await getAuthContext();
  if (!authCtx) return fail("Unauthorized", 401);
  const denied = requireManagerRole(authCtx);
  if (denied) return denied;

  return fail("Integration not available yet", 503);
}
