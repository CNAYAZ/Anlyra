import { ok, fail } from "@/lib/api/response";
import { getAuthContext } from "@/lib/session";
import {
  getBillingState,
  getMonthlyUsage,
  listInvoices,
  listCreditEntries,
} from "@/lib/billing/repository";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return fail("Unauthenticated", 401);

  const [state, usage, invoices, creditHistory] = await Promise.all([
    getBillingState(ctx.organizationId),
    getMonthlyUsage(ctx.organizationId),
    listInvoices(ctx.organizationId),
    listCreditEntries(ctx.organizationId),
  ]);

  return ok({ state, usage, invoices, creditHistory });
}
