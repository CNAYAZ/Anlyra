import { ok, fail } from '@/lib/api';
import { getCurrentContext } from '@/lib/session';
import { getFinancialFacts } from '@/lib/facts/financial-facts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/analysis/facts — deterministic financial facts for the current org,
// computed from real FinancialRecord/Receivable/RecurringExpense rows (no AI).
export async function GET() {
  try {
    const { organizationId } = await getCurrentContext();
    const facts = await getFinancialFacts(organizationId);
    return ok({ facts });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
