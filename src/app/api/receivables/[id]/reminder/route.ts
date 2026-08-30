import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { generateReminders, suggestTone } from '@/lib/reminders/generate';
import type { ReminderResponse } from '@/types/receivable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  tone: z.enum(['cortese', 'neutro', 'fermo', 'sollecito_finale']).optional(),
});

// POST /api/receivables/[id]/reminder
// Generates reminder text (subject + body) for a receivable using the existing
// pure generator in src/lib/reminders/generate.ts. The tone is taken from the
// body when provided, otherwise auto-selected from days overdue via suggestTone.
// v1: text only — NO email is sent and NO AI is called.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Switched from getCurrentContext to the STRICT context: this is a POST,
    // and it was the only mutation-shaped route still resolving through the
    // fallback, so an anonymous visitor could reach it. It writes nothing and
    // calls no model, but "reachable anonymously" is not a property a POST
    // should have.
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;
    const { organizationId } = authCtx;

    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json ?? {});
    if (!parsed.success) return fail('INVALID_INPUT', 400);

    const receivable = await prisma.receivable.findFirst({
      where: { id: (await ctx.params).id, organizationId },
    });
    if (!receivable) return fail('NOT_FOUND', 404);

    const tone = parsed.data.tone ?? suggestTone(receivable.dueDate);

    const set = generateReminders({
      customerName: receivable.customerName,
      amount: receivable.amount,
      currency: receivable.currency,
      invoiceNumber: receivable.invoiceNumber ?? undefined,
      dueAt: receivable.dueDate,
      tone,
    });

    const response: ReminderResponse = {
      variants: set.variants.map((v) => ({
        tone: v.tone,
        subject: v.subject,
        body: v.body,
        daysOverdue: v.daysOverdue,
      })),
    };

    return ok(response);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
