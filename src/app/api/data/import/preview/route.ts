import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ok, fail } from '@/lib/api';
import { getCurrentContext } from '@/lib/session';
import { getImportTarget, suggestMapping } from '@/lib/import-targets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

type Row = Record<string, unknown>;

function parseCsv(buf: Buffer): { columns: string[]; rows: Row[] } {
  const text = buf.toString('utf8');
  const parsed = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const rows = (parsed.data as Row[]).filter((r) => r && Object.keys(r).length > 0);
  const columns = parsed.meta.fields ?? (rows[0] ? Object.keys(rows[0]) : []);
  return { columns, rows };
}

function parseExcel(buf: Buffer): { columns: string[]; rows: Row[] } {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { columns: [], rows: [] };
  const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: '', raw: false });
  const columns = json[0] ? Object.keys(json[0]).map((c) => c.trim()) : [];
  return { columns, rows: json };
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentContext();

    const form = await req.formData();
    const file = form.get('file');
    const targetKey = form.get('targetKey');

    if (!file || !(file instanceof Blob)) return fail('FILE_REQUIRED', 400);
    if (typeof targetKey !== 'string') return fail('TARGET_REQUIRED', 400);

    const target = getImportTarget(targetKey);
    if (!target) return fail('INVALID_TARGET', 400);

    if (file.size > MAX_FILE_SIZE) return fail('FILE_TOO_LARGE', 400);

    const fileName = (file as unknown as { name?: string }).name ?? 'upload';
    const ext = fileName.toLowerCase().split('.').pop() ?? '';
    const buffer = Buffer.from(await file.arrayBuffer());

    let parsed: { columns: string[]; rows: Row[] };
    if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') {
      parsed = parseExcel(buffer);
    } else if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
      parsed = parseCsv(buffer);
    } else {
      // try CSV fallback by content
      try {
        parsed = parseCsv(buffer);
        if (parsed.columns.length === 0) throw new Error('empty');
      } catch {
        return fail('UNSUPPORTED_FORMAT', 400);
      }
    }

    if (parsed.columns.length === 0 || parsed.rows.length === 0) {
      return fail('EMPTY_FILE', 400);
    }

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
      batchId: randomUUID(),
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
