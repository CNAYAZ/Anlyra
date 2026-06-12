import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type ParsedRow = Record<string, unknown>;
export type ParsedFile = { columns: string[]; rows: ParsedRow[] };

export function parseCsv(buf: Buffer): ParsedFile {
  const text = buf.toString('utf8');
  const parsed = Papa.parse<ParsedRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const rows = (parsed.data as ParsedRow[]).filter((r) => r && Object.keys(r).length > 0);
  const columns = parsed.meta.fields ?? (rows[0] ? Object.keys(rows[0]) : []);
  return { columns, rows };
}

export function parseExcel(buf: Buffer): ParsedFile {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { columns: [], rows: [] };
  const json = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: '', raw: false });
  const columns = json[0] ? Object.keys(json[0]).map((c) => c.trim()) : [];
  return { columns, rows: json };
}

/** Parse a file buffer by extension, with CSV fallback for unknown extensions. */
export function parseImportFile(buf: Buffer, fileName: string): ParsedFile {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') return parseExcel(buf);
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') return parseCsv(buf);
  return parseCsv(buf);
}
