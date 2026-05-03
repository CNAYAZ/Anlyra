import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api-response';
import { importRequestSchema } from '@/lib/validators';
import { parseAmountValue, parseDateValue, type FieldKind } from '@/lib/parsers';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = importRequestSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid', 400);

  const { type, fileName, fileSize, rows, mapping } = parsed.data;
  const { userId, organizationId } = await getCurrentContext();

  const colByKind = new Map<FieldKind, string>();
  for (const [col, kind] of Object.entries(mapping)) {
    if (kind && kind !== 'ignore') colByKind.set(kind as FieldKind, col);
  }
  const get = (row: Record<string, string>, kind: FieldKind) => {
    const col = colByKind.get(kind);
    if (!col) return '';
    return (row[col] ?? '').toString().trim();
  };

  const importBatch = await prisma.importBatch.create({
    data: {
      userId,
      organizationId,
      fileName,
      fileSize,
      type,
      rowsTotal: rows.length,
      status: 'PROCESSING',
    },
  });

  let imported = 0;
  const errors: { rowIndex: number; reason: string }[] = [];

  try {
    if (type === 'REVENUE' || type === 'COST') {
      const data: any[] = [];
      rows.forEach((row, i) => {
        const dateRaw = get(row, 'date');
        const amountRaw = get(row, 'amount');
        const date = parseDateValue(dateRaw);
        const amount = parseAmountValue(amountRaw);
        const category = get(row, 'category') || 'other';
        if (!date) {
          errors.push({ rowIndex: i, reason: 'invalidDate' });
          return;
        }
        if (amount === null) {
          errors.push({ rowIndex: i, reason: 'invalidAmount' });
          return;
        }
        data.push({
          userId,
          organizationId,
          importId: importBatch.id,
          date,
          amount,
          currency: get(row, 'currency') || 'EUR',
          category,
          description: get(row, 'description') || null,
          recurring: /^(y(es)?|1|true|si|sì)$/i.test(get(row, 'recurring')),
        });
      });

      if (data.length > 0) {
        if (type === 'REVENUE') {
          await prisma.revenue.createMany({ data });
        } else {
          await prisma.cost.createMany({ data });
        }
      }
      imported = data.length;
    } else if (type === 'KPI') {
      const data: any[] = [];
      rows.forEach((row, i) => {
        const dateRaw = get(row, 'date');
        const valRaw = get(row, 'value');
        const date = parseDateValue(dateRaw);
        const value = parseAmountValue(valRaw);
        const name = get(row, 'name');
        const unit = get(row, 'unit') || '#';
        if (!date) return errors.push({ rowIndex: i, reason: 'invalidDate' });
        if (value === null) return errors.push({ rowIndex: i, reason: 'invalidAmount' });
        if (!name) return errors.push({ rowIndex: i, reason: 'missingRequired' });
        const targetRaw = get(row, 'target');
        const target = targetRaw ? parseAmountValue(targetRaw) : null;
        data.push({
          userId,
          organizationId,
          importId: importBatch.id,
          date,
          name,
          value,
          target,
          unit,
        });
      });
      if (data.length > 0) await prisma.kpi.createMany({ data });
      imported = data.length;
    } else if (type === 'COMPETITOR') {
      const data: any[] = [];
      rows.forEach((row, i) => {
        const name = get(row, 'name');
        if (!name) return errors.push({ rowIndex: i, reason: 'missingRequired' });
        const estRaw = get(row, 'estimatedRevenue');
        const msRaw = get(row, 'marketShare');
        const empRaw = get(row, 'employees');
        data.push({
          userId,
          organizationId,
          importId: importBatch.id,
          name,
          website: get(row, 'website') || null,
          description: get(row, 'description') || null,
          estimatedRevenue: estRaw ? parseAmountValue(estRaw) : null,
          marketShare: msRaw ? parseAmountValue(msRaw) : null,
          employees: empRaw ? Number(empRaw) || null : null,
          strengths: [],
          weaknesses: [],
        });
      });
      if (data.length > 0) await prisma.competitor.createMany({ data });
      imported = data.length;
    }

    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        rowsImported: imported,
        rowsErrors: errors.length,
        status: 'COMPLETED',
        errors: errors.length ? errors : undefined,
      },
    });

    return ok({ importId: importBatch.id, imported, errors: errors.length });
  } catch (err) {
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: 'FAILED',
        errors: [{ message: err instanceof Error ? err.message : 'unknown' }],
      },
    });
    return fail(err instanceof Error ? err.message : 'import failed', 500);
  }
}
