import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { getCurrentContext } from '@/lib/session';
import { getFinancialFacts } from '@/lib/facts/financial-facts';
import { locales, defaultLocale, type Locale } from '@/i18n/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reads the UI language for this request. The Situazione page passes it as
 * ?locale=, so the facts come back already written in the language the user is
 * actually looking at — previously they were always composed in Italian, so
 * /en/situazione showed an English heading over Italian cards.
 * Anything unexpected falls back to the default locale rather than throwing.
 */
function localeFrom(req: NextRequest): Locale {
  const raw = req.nextUrl.searchParams.get('locale');
  return locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale;
}

// GET /api/analysis/facts — deterministic financial facts for the current org,
// computed from real FinancialRecord/Receivable/RecurringExpense rows (no AI).
export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getCurrentContext();
    const facts = await getFinancialFacts(organizationId, localeFrom(req));
    return ok({ facts });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
