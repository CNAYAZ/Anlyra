import { fail } from '@/lib/api/response';

/**
 * Mercato (competitor, trend, posizionamento) and Operations (clienti, team,
 * efficienza) run on synthetic engines: fixed arrays, sine/cosine curves and
 * KPI defaults (churn 4.2, NPS 42), not the company's numbers. Their menu
 * entries have been off since 2026-06-30; this switch closes the rest — the
 * pages redirect to the dashboard (market/layout.tsx, operations/layout.tsx)
 * and every API route under api/analysis/market and api/analysis/operations
 * answers 503 with no data.
 *
 * Nothing was deleted: the code, the Competitor tables and their rows are
 * untouched, so turning this back on is a one-line change. Annotated as
 * `boolean` on purpose, so the checks below the early return are not flagged
 * as unreachable code.
 *
 * Benchmarks (ai/benchmarks) are NOT covered by this switch.
 */
export const MARKET_AND_OPERATIONS_AVAILABLE: boolean = false;

/** The answer of a route that is switched off, like the integrations' "not available yet". */
export function marketOperationsUnavailable() {
  return fail('Not available yet', 503);
}
