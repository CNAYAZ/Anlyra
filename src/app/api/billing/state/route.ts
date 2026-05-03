import { ok, fail } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import {
  getBillingState,
  getMonthlyUsage,
  listInvoices,
  listCreditEntries,
} from "@/lib/billing/repository";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail("Unauthenticated", 401);
  }

  const [state, usage, invoices, creditHistory] = await Promise.all([
    getBillingState(user.orgId),
    getMonthlyUsage(user.orgId),
    listInvoices(user.orgId),
    listCreditEntries(user.orgId),
  ]);

  return ok({ state, usage, invoices, creditHistory });
}
