import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api-response';
import { autoDetect, isAcceptedFile, MAX_FILE_BYTES } from '@/lib/parsers';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return fail('noFile', 400);
    if (file.size > MAX_FILE_BYTES) return fail('fileTooLarge', 413);

    const check = isAcceptedFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!check.ok) return fail(check.reason, 415);

    const lower = file.name.toLowerCase();
    let headers: string[] = [];
    let rows: Record<string, string>[] = [];

    if (lower.endsWith('.csv')) {
      const text = await file.text();
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => h.trim(),
      });
      rows = (result.data ?? []).filter(Boolean);
      headers = result.meta.fields?.map((f) => f.trim()) ?? [];
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const firstSheet = wb.SheetNames[0];
      if (firstSheet) {
        const sheet = wb.Sheets[firstSheet];
        if (sheet) {
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: '',
            raw: false,
          });
          rows = json.map((r) =>
            Object.fromEntries(
              Object.entries(r).map(([k, v]) => [k.trim(), String(v ?? '')])
            )
          );
          headers = rows[0] ? Object.keys(rows[0]) : [];
        }
      }
    }

    const detection: Record<string, string> = {};
    for (const h of headers) {
      const sample = rows[0]?.[h] ?? '';
      detection[h] = autoDetect(h, sample);
    }

    return ok({
      fileName: file.name,
      fileSize: file.size,
      headers,
      preview: rows.slice(0, 10),
      totalRows: rows.length,
      detection,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'upload failed', 500);
  }
}
