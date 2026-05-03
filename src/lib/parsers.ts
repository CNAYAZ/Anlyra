import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_MIME = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const ACCEPTED_EXT = ['.csv', '.xls', '.xlsx'];

export type ParsedFile = {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
};

export function isAcceptedFile(file: { name: string; size: number; type?: string }) {
  if (file.size > MAX_FILE_BYTES) return { ok: false as const, reason: 'fileTooLarge' as const };
  const lower = file.name.toLowerCase();
  const hasExt = ACCEPTED_EXT.some((e) => lower.endsWith(e));
  if (!hasExt) return { ok: false as const, reason: 'unsupportedFormat' as const };
  return { ok: true as const };
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.csv')) return parseCsv(file);
  return parseExcel(file);
}

async function parseCsv(file: File): Promise<ParsedFile> {
  const text = await file.text();
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  const rows = (result.data ?? []).filter(Boolean);
  const headers = result.meta.fields?.map((f) => f.trim()) ?? [];
  return { headers, rows, totalRows: rows.length };
}

async function parseExcel(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return { headers: [], rows: [], totalRows: 0 };
  const sheet = wb.Sheets[firstSheet];
  if (!sheet) return { headers: [], rows: [], totalRows: 0 };
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
  const rows = json.map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), String(v ?? '')]))
  );
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return { headers, rows, totalRows: rows.length };
}

const DATE_HINTS = ['date', 'data', 'giorno', 'day', 'mese', 'month'];
const AMOUNT_HINTS = ['amount', 'importo', 'totale', 'total', 'value', 'valore', 'price', 'prezzo'];
const CATEGORY_HINTS = ['category', 'categoria', 'type', 'tipo'];
const DESCRIPTION_HINTS = ['description', 'descrizione', 'notes', 'note'];
const NAME_HINTS = ['name', 'nome'];
const WEBSITE_HINTS = ['website', 'site', 'sito', 'url'];

export type FieldKind =
  | 'ignore'
  | 'date'
  | 'amount'
  | 'currency'
  | 'category'
  | 'description'
  | 'recurring'
  | 'name'
  | 'value'
  | 'target'
  | 'unit'
  | 'website'
  | 'estimatedRevenue'
  | 'employees'
  | 'marketShare'
  | 'strengths'
  | 'weaknesses';

export function autoDetect(header: string, sample: string): FieldKind {
  const h = header.toLowerCase();
  if (DATE_HINTS.some((k) => h.includes(k))) return 'date';
  if (AMOUNT_HINTS.some((k) => h.includes(k))) return 'amount';
  if (CATEGORY_HINTS.some((k) => h.includes(k))) return 'category';
  if (DESCRIPTION_HINTS.some((k) => h.includes(k))) return 'description';
  if (WEBSITE_HINTS.some((k) => h.includes(k))) return 'website';
  if (NAME_HINTS.some((k) => h.includes(k))) return 'name';
  if (/^\d{4}-\d{2}-\d{2}/.test(sample) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(sample)) return 'date';
  if (/^-?\d+[.,]?\d*$/.test(sample.replace(/\s|€|\$|EUR|USD/gi, ''))) return 'amount';
  return 'ignore';
}

export function parseDateValue(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  const eu = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(s);
  if (eu) {
    const day = eu[1]!.padStart(2, '0');
    const month = eu[2]!.padStart(2, '0');
    let year = eu[3]!;
    if (year.length === 2) year = `20${year}`;
    const d = new Date(`${year}-${month}-${day}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function parseAmountValue(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[€$£¥]|EUR|USD|GBP/gi, '')
    .replace(/\s/g, '')
    .trim();
  if (!cleaned) return null;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;
  if (hasComma && hasDot) {
    normalized = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
