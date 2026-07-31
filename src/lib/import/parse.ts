import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { parseItalianAmount } from '@/lib/import/amount';

export type ParsedRow = Record<string, unknown>;
export type ParsedFile = { columns: string[]; rows: ParsedRow[] };

/**
 * Parsing failure with a stable code the API route turns into a 400 the UI can
 * translate, instead of leaking a library stack trace.
 */
export class ImportParseError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'ImportParseError';
  }
}

/**
 * Hard ceilings applied to spreadsheets. They are mitigations, not business
 * rules: an SME ledger is a few thousand movements a year and a handful of
 * columns, so these are ~1-2 orders of magnitude above any legitimate file
 * while still bounding how much memory a single upload can turn into.
 * The 10 MB size cap in the route is checked BEFORE the bytes are read and
 * remains the first line of defence.
 */
export const MAX_EXCEL_BYTES = 10 * 1024 * 1024;
export const MAX_EXCEL_ROWS = 100_000;
export const MAX_EXCEL_COLUMNS = 256;
export const MAX_EXCEL_SHEETS = 50;

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

/**
 * Legacy Excel (.xls, BIFF/OLE2 compound document, pre-2007) starts with the
 * OLE2 signature; .xlsx/.xlsm are ZIP containers starting with "PK\x03\x04".
 * Checked on the bytes, not on the extension: a legacy file renamed .xlsx is
 * still a legacy file.
 */
function isLegacyXls(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0 &&
    buf[4] === 0xa1 && buf[5] === 0xb1 && buf[6] === 0x1a && buf[7] === 0xe1
  );
}

/** A date-only cell is rendered as YYYY-MM-DD; keep the full ISO when it carries a time. */
function excelDateToString(d: Date): string {
  const iso = d.toISOString();
  return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
}

/**
 * Flatten one ExcelJS cell to the primitive the import pipeline expects.
 * ExcelJS returns rich objects where SheetJS returned formatted text, so the
 * cases that differ between the two libraries are all handled here:
 * formulas yield their cached result, rich text is concatenated, hyperlinks
 * keep their display text, dates become date strings, empty cells become ''
 * (the old `defval: ''`) and numbers stay numbers — `parseItalianAmount`
 * accepts a number directly, so no formatting round-trip can corrupt them.
 */
function cellToValue(value: unknown): unknown {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return excelDateToString(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.richText)) {
      return (v.richText as { text?: unknown }[]).map((part) => String(part?.text ?? '')).join('');
    }
    // Formula cell: use the cached result Excel stored, never the expression.
    if ('formula' in v || 'sharedFormula' in v) return cellToValue(v.result ?? '');
    if ('error' in v) return String(v.error);
    if ('text' in v) return String(v.text ?? '');
  }
  return String(value);
}

/**
 * Build the column keys from the header row, reproducing the naming SheetJS
 * used so an already-saved mapping keeps matching: blank headers become
 * `__EMPTY`, `__EMPTY_1`, … and duplicates get a `_1`, `_2`, … suffix.
 * Keys are trimmed at the source so row keys and `columns` always agree.
 */
function buildColumnKeys(headerValues: unknown[]): string[] {
  const keys: string[] = [];
  const seen = new Map<string, number>();
  let blanks = 0;

  for (const raw of headerValues) {
    const text = String(cellToValue(raw) ?? '').trim();
    let key: string;
    if (!text) {
      key = blanks === 0 ? '__EMPTY' : `__EMPTY_${blanks}`;
      blanks++;
    } else {
      key = text;
    }
    const previous = seen.get(key);
    if (previous === undefined) {
      seen.set(key, 0);
    } else {
      const next = previous + 1;
      seen.set(key, next);
      key = `${key}_${next}`;
    }
    keys.push(key);
  }
  return keys;
}

export async function parseExcel(buf: Buffer): Promise<ParsedFile> {
  if (buf.length > MAX_EXCEL_BYTES) throw new ImportParseError('FILE_TOO_LARGE');
  if (isLegacyXls(buf)) throw new ImportParseError('LEGACY_XLS_UNSUPPORTED');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);

  if (wb.worksheets.length > MAX_EXCEL_SHEETS) throw new ImportParseError('TOO_MANY_SHEETS');

  // Same contract as before: only the first sheet is imported.
  const ws = wb.worksheets[0];
  if (!ws) return { columns: [], rows: [] };

  const columnCount = ws.columnCount;
  const rowCount = ws.rowCount;
  if (columnCount > MAX_EXCEL_COLUMNS) throw new ImportParseError('TOO_MANY_COLUMNS');
  if (rowCount > MAX_EXCEL_ROWS) throw new ImportParseError('TOO_MANY_ROWS');
  if (columnCount === 0 || rowCount === 0) return { columns: [], rows: [] };

  const readRow = (rowNumber: number): unknown[] => {
    const row = ws.getRow(rowNumber);
    const out: unknown[] = [];
    for (let c = 1; c <= columnCount; c++) out.push(cellToValue(row.getCell(c).value));
    return out;
  };

  // Leading blank rows are skipped, as SheetJS did by starting from the
  // sheet's used range: the first non-empty row is the header.
  let headerRowNumber = 0;
  for (let r = 1; r <= rowCount; r++) {
    if (readRow(r).some((v) => v !== '')) {
      headerRowNumber = r;
      break;
    }
  }
  if (headerRowNumber === 0) return { columns: [], rows: [] };

  const columns = buildColumnKeys(readRow(headerRowNumber));

  const rows: ParsedRow[] = [];
  for (let r = headerRowNumber + 1; r <= rowCount; r++) {
    const values = readRow(r);
    if (values.every((v) => v === '')) continue; // blankrows: false
    const row: ParsedRow = {};
    for (let c = 0; c < columns.length; c++) row[columns[c]] = values[c] ?? '';
    rows.push(row);
  }

  return deriveTypeAndAmount({ columns, rows });
}

/** Parse a file buffer by extension, with CSV fallback for unknown extensions. */
export async function parseImportFile(buf: Buffer, fileName: string): Promise<ParsedFile> {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') return parseExcel(buf);
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') return parseCsv(buf);
  return parseCsv(buf);
}
