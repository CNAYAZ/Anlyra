import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { getImportTarget, suggestMapping } from '@/lib/import-targets';
import { parseImportFile } from '@/lib/import/parse';
import { ensureImportBatchFkRows } from '@/lib/import/batch-fk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { userId, organizationId } = authCtx;

    const form = await req.formData();
    const file = form.get('file');
    const targetKey = form.get('targetKey');

    if (!file || !(file instanceof Blob)) return fail('FILE_REQUIRED', 400);
    if (typeof targetKey !== 'string') return fail('TARGET_REQUIRED', 400);

    const target = getImportTarget(targetKey);
    if (!target) return fail('INVALID_TARGET', 400);

    if (file.size > MAX_FILE_SIZE) return fail('FILE_TOO_LARGE', 400);

    const fileName = (file as unknown as { name?: string }).name ?? 'upload';
    const buffer = Buffer.from(await file.arrayBuffer());

    let parsed;
    try {
      parsed = parseImportFile(buffer, fileName);
    } catch {
      return fail('UNSUPPORTED_FORMAT', 400);
    }

    if (parsed.columns.length === 0 || parsed.rows.length === 0) {
      return fail('EMPTY_FILE', 400);
    }

    // Real PENDING batch: the preview is persisted as a pending import that the
    // user can later commit or cancel (DELETE /api/data/import/batches/[id]).
    await ensureImportBatchFkRows(userId, organizationId);
    const batch = await prisma.importBatch.create({
      data: {
        userId,
        organizationId,
        fileName,
        fileSize: file.size,
        source: 'file',
        type: targetKey,
        rowsTotal: parsed.rows.length,
        status: 'PENDING',
      },
    });

    const samples: Record<string, string[]> = {};
    for (const col of parsed.columns) samples[col] = [];
    for (const row of parsed.rows.slice(0, 10)) {
      for (const col of parsed.columns) {
        const v = row[col];
        samples[col].push(v === null || v === undefined ? '' : String(v));
      }
    }

    const columns = parsed.columns.map((name) => ({ name, samples: samples[name] ?? [] }));
    const suggestedMapping = suggestMapping(parsed.columns, target);

    return ok({
      batchId: batch.id,
      fileName,
      fileSize: file.size,
      totalRows: parsed.rows.length,
      columns,
      suggestedMapping,
      previewRows: parsed.rows.slice(0, 10),
      allRows: parsed.rows,
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
