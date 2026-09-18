import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { getImportTarget } from '@/lib/import-targets';
import { applyMapping, buildFinancialDescription } from '@/lib/import/validate';
import { rowFingerprint } from '@/lib/import/fingerprint';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  targetKey: z.string(),
  mapping: z.record(z.string(), z.union([z.string(), z.null()])),
  rows: z.array(z.record(z.string(), z.unknown())),
});

/**
 * POST /api/data/import/duplicates — which rows of this file LOOK LIKE rows the
 * organization already has?
 *
 * Founder's decision: the product REPORTS rows that look already present and
 * shows them in the preview, it does NOT block them. Two genuine payments of
 * the same amount on the same day to the same counterparty do exist, so this
 * endpoint answers "these look already present", never "these are duplicates",
 * and the customer decides. Nothing here writes anything.
 *
 * ── WHY IT IS A SEPARATE CALL FROM /preview ──
 * The fingerprint includes the DESCRIPTION, and the description is built from
 * the column→field MAPPING (buildFinancialDescription: 'categoria/sottocategoria'),
 * which the customer only settles AFTER the preview step. Answering at parse
 * time would fingerprint rows against a mapping that does not exist yet.
 *
 * ── COST: BOUNDED BY THE FILE'S OWN DATE RANGE, NOT BY THE HISTORY ──
 * It does NOT read the organization's whole ledger. It takes the min and max
 * occurredAt of the rows being imported and reads only that window, selecting
 * three columns. FinancialRecord already carries @@index([organizationId,
 * occurredAt]), which is exactly this query. A bank statement covers one month,
 * so an organization with ten years of movements is read for one month of them;
 * the work scales with the FILE, not with the customer's age on the product.
 *
 * ── ONLY financial_records ──
 * The other three targets have no comparable natural key: customer_stats
 * already upserts on (organizationId, period), and kpis/competitors have no
 * date+amount identity to compare. They answer "nothing suspected" rather than
 * inventing a rule.
 *
 * No requireWritableOrg here on purpose: this route only reads, and the demo
 * organization can never reach it — POST /preview refuses the demo before a
 * file is ever parsed.
 */
export async function POST(req: NextRequest) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return fail('INVALID_BODY', 400);

    const { targetKey, mapping, rows } = parsed.data;
    const target = getImportTarget(targetKey);
    if (!target) return fail('INVALID_TARGET', 400);

    if (targetKey !== 'financial_records' || rows.length === 0) {
      return ok({ suspectedRows: [], checkedRows: 0, comparedAgainst: 0 });
    }

    // Validate with the SAME primitives the preview and the commit use
    // (applyMapping + target.schema), keeping the ORIGINAL row index: the
    // preview numbers its rows by position in this same array, so the indexes
    // this route returns must line up with what the customer sees on screen.
    const candidates: { index: number; fingerprint: string; at: Date }[] = [];
    rows.forEach((rawRow, idx) => {
      const result = target.schema.safeParse(applyMapping(rawRow, mapping));
      if (!result.success) return; // already reported as an error by the preview
      const r = result.data as Record<string, unknown>;
      const at = new Date(r.occurredAt as string);
      candidates.push({
        index: idx + 1,
        fingerprint: rowFingerprint(at, r.amount as number, buildFinancialDescription(r)),
        at,
      });
    });

    if (candidates.length === 0) {
      return ok({ suspectedRows: [], checkedRows: 0, comparedAgainst: 0 });
    }

    const times = candidates.map((c) => c.at.getTime());
    const existing = await prisma.financialRecord.findMany({
      where: {
        organizationId,
        occurredAt: { gte: new Date(Math.min(...times)), lte: new Date(Math.max(...times)) },
      },
      select: { occurredAt: true, amount: true, description: true },
    });

    const known = new Set(
      existing.map((e) => rowFingerprint(e.occurredAt, e.amount, e.description ?? '')),
    );

    const suspectedRows = candidates
      .filter((c) => known.has(c.fingerprint))
      .map((c) => c.index);

    return ok({
      suspectedRows,
      checkedRows: candidates.length,
      comparedAgainst: existing.length,
    });
  } catch (e) {
    return failFromError(e);
  }
}
