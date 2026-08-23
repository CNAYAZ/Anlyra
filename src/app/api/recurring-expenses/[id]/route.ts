import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireManagerRole } from '@/lib/auth/require-role';
import { auditLog } from '@/lib/audit/log';
import { toRecurringExpenseDTO } from '@/lib/recurring-expenses/dto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  vendorName: z.string().trim().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  frequency: z.enum(['MONTHLY', 'YEARLY']).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  nextRenewal: z.coerce.date().nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

// PATCH /api/recurring-expenses/[id] — update fields, including `active` to
// cancel/reactivate. Ownership verified against the session org.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;
    const json = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) return fail('INVALID_INPUT', 400);
    const p = parsed.data;

    const existing = await prisma.recurringExpense.findFirst({
      where: { id: (await ctx.params).id, organizationId },
    });
    if (!existing) return fail('NOT_FOUND', 404);

    const data: Prisma.RecurringExpenseUpdateInput = {};
    if (p.vendorName !== undefined) data.vendorName = p.vendorName;
    if (p.amount !== undefined) data.amount = p.amount;
    if (p.currency !== undefined) data.currency = p.currency.toUpperCase();
    if (p.frequency !== undefined) data.frequency = p.frequency;
    if (p.category !== undefined) data.category = p.category;
    if (p.nextRenewal !== undefined) data.nextRenewal = p.nextRenewal;
    if (p.active !== undefined) data.active = p.active;
    if (p.notes !== undefined) data.notes = p.notes;

    if (Object.keys(data).length === 0) return fail('INVALID_INPUT', 400);

    const updated = await prisma.recurringExpense.update({
      where: { id: existing.id },
      data,
    });

    return ok({ expense: toRecurringExpenseDTO(updated) });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

// DELETE /api/recurring-expenses/[id] — remove. Ownership verified.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const denied = requireManagerRole(authCtx);
    if (denied) return denied;
    const { organizationId } = authCtx;
    const existing = await prisma.recurringExpense.findFirst({
      where: { id: (await ctx.params).id, organizationId },
    });
    if (!existing) return fail('NOT_FOUND', 404);

    await prisma.recurringExpense.delete({ where: { id: existing.id } });
    await auditLog({
      action: 'recurring_expense.delete',
      userId: authCtx.userId,
      organizationId,
      targetType: 'recurring_expense',
      targetId: existing.id,
      req: _req,
    });
    return ok({ id: existing.id });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
