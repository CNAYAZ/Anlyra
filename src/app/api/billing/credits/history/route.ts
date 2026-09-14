import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api/response';
import { getAuthContext } from '@/lib/session';
import {
  getCreditBalance,
  getCreditLedgerSum,
  listCreditEntriesPage,
} from '@/lib/billing/repository';
import type { CreditHistoryResponse } from '@/types/billing';

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Same bounds as listQuerySchema (financial-query.ts): default 20, capped at
  // 100. An active org's ledger can run to hundreds of rows a month (see the
  // report), so this is genuinely paginated, not "return everything".
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * The organization's credit ledger: every movement recorded by
 * recordCreditEntry / the monthly renewal transaction, newest first, paged.
 *
 * ── WHO CAN READ THIS ──
 * Any authenticated member of the org — no requireManagerRole/requireOwnerRole.
 * Same tier as its two siblings, GET /api/billing/status and GET
 * /api/billing/credits: both are explicitly "not owner-only" because they
 * return "the SAME number every member already sees rendered on the page
 * they're looking at". This route returns the BREAKDOWN of that same number.
 * Showing where a balance came from is not more sensitive than showing the
 * balance itself, and MANAGER_ROLES' own rule (require-role.ts) is that
 * reading business data stays open to every member — only DESTRUCTIVE actions
 * and billing ACTIONS (checkout, portal — requireOwnerRole) are restricted.
 *
 * getAuthContext(), not getCurrentContext(): it never falls back to the demo
 * org and only accepts a real NextAuth session backed by a real Membership
 * row. There is no organizationId anywhere in the request — no query param,
 * no body — so there is no way to ask for another org's ledger; the id comes
 * from the session alone, same as every other billing route in this folder.
 */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return fail('Unauthenticated', 401);

  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return fail('INVALID_INPUT', 400);
  const { page, pageSize } = parsed.data;

  const [{ items, total }, balance, ledgerSum] = await Promise.all([
    listCreditEntriesPage(ctx.organizationId, { page, pageSize }),
    getCreditBalance(ctx.organizationId),
    getCreditLedgerSum(ctx.organizationId),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const response: CreditHistoryResponse = {
    entries: items.map((e) => ({
      id: e.id,
      delta: e.delta,
      reason: e.reason,
      createdAt: e.createdAt.toISOString(),
    })),
    pagination: { total, page, pageSize, totalPages },
    incomplete: ledgerSum !== balance,
  };

  return ok(response);
}
