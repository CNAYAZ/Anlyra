import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parseItalianAmount } from '@/lib/import/amount';

export type ParsedRow = Record<string, unknown>;
export type ParsedFile = { columns: string[]; rows: ParsedRow[] };

/**
 * Detect ';' vs ',' from the header line. Italian/bank CSV exports use ';'
 * because ',' is the decimal separator in their own amount columns.
 * Papa.parse auto-detects most of the time, but an explicit count keeps the
 * behavior deterministic for files where the heuristic could be ambiguous.
 */
export function detectCsvDelimiter(text: string): ',' | ';' {
  const headerLine = text.split(/\r?\n/, 1)[0] ?? '';
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ';' : ',';
}

function normalizeColumnName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

const TYPE_COLUMN_NAMES = new Set(['tipo', 'type', 'kind']);
const DEBIT_COLUMN_NAMES = new Set(['dare', 'uscite', 'uscita', 'addebiti', 'addebito']);
const CREDIT_COLUMN_NAMES = new Set(['avere', 'entrate', 'entrata', 'accrediti', 'accredito']);
const AMOUNT_COLUMN_NAMES = new Set(['importo', 'amount', 'valore', 'totale', 'total']);

/**
 * Bank-statement CSVs/XLSX rarely have an explicit "tipo" column: the
 * movement direction is encoded either as two columns (Dare/Avere,
 * Uscite/Entrate, Addebiti/Accrediti) or as the sign of a single amount
 * column. When no explicit type column is present, derive `type` (and a
 * normalized positive `amount`) from whichever convention is detected.
 * Files with an explicit type column (e.g. fixtures/import-sample.csv) are
 * returned unchanged.
 */
export function deriveTypeAndAmount(parsed: ParsedFile): ParsedFile {
  const { columns, rows } = parsed;
  const lookup = columns.map((c) => ({ original: c, norm: normalizeColumnName(c) }));
  if (lookup.some((c) => TYPE_COLUMN_NAMES.has(c.norm))) return parsed;

  const debitCol = lookup.find((c) => DEBIT_COLUMN_NAMES.has(c.norm));
  const creditCol = lookup.find((c) => CREDIT_COLUMN_NAMES.has(c.norm));

  if (debitCol && creditCol) {
    const newColumns = [
      ...columns.filter((c) => c !== debitCol.original && c !== creditCol.original),
      'amount',
      'type',
    ];
    const newRows = rows.map((row) => {
      const { [debitCol.original]: debitRaw, [creditCol.original]: creditRaw, ...rest } = row;
      const creditVal = parseItalianAmount(creditRaw);
      const debitVal = parseItalianAmount(debitRaw);
      const useCredit = creditVal !== undefined && creditVal !== 0;
      return {
        ...rest,
        amount: useCredit ? creditVal : debitVal,
        type: useCredit ? 'REVENUE' : debitVal !== undefined ? 'COST' : undefined,
      };
    });
    return { columns: newColumns, rows: newRows };
  }

  const amountCol = lookup.find((c) => AMOUNT_COLUMN_NAMES.has(c.norm));
  if (amountCol) {
    const hasNegative = rows.some((row) => {
      const v = parseItalianAmount(row[amountCol.original]);
      return v !== undefined && v < 0;
    });
    if (!hasNegative) return parsed;
    const newColumns = columns.includes('type') ? columns : [...columns, 'type'];
    const newRows = rows.map((row) => {
      const raw = parseItalianAmount(row[amountCol.original]);
      if (raw === undefined) return row;
      return { ...row, [amountCol.original]: Math.abs(raw), type: raw < 0 ? 'COST' : 'REVENUE' };
    });
    return { columns: newColumns, rows: newRows };
  }

  return parsed;
}

export function parseCsv(buf: Buffer): ParsedFile {
  const text = buf.toString('utf8');
  const delimiter = detectCsvDelimiter(text);
  const parsed = Papa.parse<ParsedRow>(text, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const rows = (parsed.data as ParsedRow[]).filter((r) => r && Object.keys(r).length > 0);
  const columns = parsed.meta.fields ?? (rows[0] ? Object.keys(rows[0]) : []);
  return deriveTypeAndAmount({ columns, rows });
}

export function parseExcel(buf: Buffer): ParsedFile {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { columns: [], rows: [] };
  const json = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: '', raw: false });
  const columns = json[0] ? Object.keys(json[0]).map((c) => c.trim()) : [];
  return deriveTypeAndAmount({ columns, rows: json });
}

/** Parse a file buffer by extension, with CSV fallback for unknown extensions. */
export function parseImportFile(buf: Buffer, fileName: string): ParsedFile {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') return parseExcel(buf);
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') return parseCsv(buf);
  return parseCsv(buf);
}
