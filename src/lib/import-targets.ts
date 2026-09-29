import { z } from 'zod';
import { parseItalianAmount } from '@/lib/import/amount';
import { EXPENSE_FREQUENCIES } from '@/types/recurring-expense';

export type ImportTargetKey =
  | 'financial_records'
  | 'kpis'
  | 'competitors'
  | 'customer_stats'
  | 'receivables'
  | 'recurring_expenses';

export type ImportFieldDescriptor = {
  key: string;
  required: boolean;
  /** i18n label key under `dataImport.fieldLabels` */
  labelKey: string;
  /** synonyms used for auto-mapping (lowercased, normalized) */
  synonyms: string[];
};

export type ImportTarget = {
  key: ImportTargetKey;
  /** i18n label key under `dataImport` */
  labelKey: string;
  /** i18n description key under `dataImport` */
  descriptionKey: string;
  fields: ImportFieldDescriptor[];
  schema: z.ZodTypeAny;
};

const numberLike = z.preprocess((v) => parseItalianAmount(v), z.number());

const optionalNumber = z.preprocess((v) => parseItalianAmount(v), z.number().optional());

const optionalInt = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(String(v).replace(/[\s,.]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}, z.number().int().optional());

const requiredInt = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(String(v).replace(/[\s,.]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}, z.number().int());

const optionalString = z.preprocess(
  (v) => (v === null || v === undefined || v === '' ? undefined : String(v).trim()),
  z.string().optional(),
);

const requiredString = z.preprocess(
  (v) => (v === null || v === undefined ? undefined : String(v).trim() || undefined),
  z.string().min(1),
);

const typeEnum = z.preprocess((v) => {
  const s = String(v ?? '').trim().toLowerCase();
  if (['income', 'revenue', 'ricavo', 'ricavi', 'entrata', 'entrate', 'in'].includes(s)) return 'REVENUE';
  if (['expense', 'cost', 'costo', 'costi', 'uscita', 'uscite', 'out'].includes(s)) return 'COST';
  return s.toUpperCase();
}, z.enum(['REVENUE', 'COST'], {
  errorMap: () => ({ message: "Tipo non riconosciuto: usa 'ricavo'/'entrata' oppure 'costo'/'uscita'" }),
}));

// Positive monetary amount with Italian error messages (financial records only).
const positiveAmount = z.preprocess(
  (v) => parseItalianAmount(v),
  z.number({ required_error: 'Importo mancante', invalid_type_error: 'Importo non numerico (es. valido: 1234,56)' })
    .positive("L'importo deve essere un numero positivo"),
);

const requiredDate = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  if (v instanceof Date) return v.toISOString();
  const s = String(v).trim();
  // GG/MM/AAAA PRIMA del parse generico: new Date('05/01/2026') in JS è
  // MM/DD (US) e leggerebbe il 5 gennaio come 1 maggio. Convenzione italiana.
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const [, dd, mm, yy] = m;
    if (Number(dd) > 31 || Number(mm) > 12) return undefined;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return undefined;
}, z.string({ required_error: 'Data mancante o non valida (formati accettati: GG/MM/AAAA, AAAA-MM-GG)', invalid_type_error: 'Data mancante o non valida (formati accettati: GG/MM/AAAA, AAAA-MM-GG)' }));

const requiredCategory = z.preprocess(
  (v) => (v === null || v === undefined ? undefined : String(v).trim().replace(/\//g, '-') || undefined),
  z.string({ required_error: 'Categoria mancante' }).min(1, 'Categoria mancante'),
);

const optionalSubcategory = z.preprocess(
  (v) => (v === null || v === undefined || v === '' ? undefined : String(v).trim().replace(/\//g, '-')),
  z.string().optional(),
);

const FINANCIAL_RECORDS: ImportTarget = {
  key: 'financial_records',
  labelKey: 'targetFinancial',
  descriptionKey: 'targetFinancialDesc',
  fields: [
    { key: 'amount', required: true, labelKey: 'fieldAmount', synonyms: ['amount', 'importo', 'valore', 'value', 'totale', 'total', 'somma', 'sum'] },
    { key: 'type', required: true, labelKey: 'fieldType', synonyms: ['type', 'tipo', 'kind', 'categoria_movimento'] },
    { key: 'occurredAt', required: true, labelKey: 'fieldOccurredAt', synonyms: ['date', 'data', 'occurredat', 'occurred_at', 'datamovimento', 'datadocumento', 'when'] },
    { key: 'category', required: true, labelKey: 'fieldCategory', synonyms: ['category', 'categoria', 'cat', 'voce', 'tipologia', 'descrizione', 'causale'] },
    { key: 'subcategory', required: false, labelKey: 'fieldSubcategory', synonyms: ['subcategory', 'sottocategoria', 'sub', 'sottovoce', 'dettaglio'] },
    { key: 'source', required: false, labelKey: 'fieldSource', synonyms: ['source', 'fonte', 'origine', 'channel', 'canale'] },
  ],
  // NOTE (DATA-001): la causale/descrizione libera del file NON viene importata.
  // In financialRecord.description finisce SOLO 'categoria/sottocategoria':
  // le pagine analytics ricavano le categorie splittando description su '/'.
  schema: z.object({
    amount: positiveAmount,
    type: typeEnum,
    occurredAt: requiredDate,
    category: requiredCategory,
    subcategory: optionalSubcategory,
    source: optionalString,
  }),
};

const KPIS: ImportTarget = {
  key: 'kpis',
  labelKey: 'targetKpis',
  descriptionKey: 'targetKpisDesc',
  fields: [
    { key: 'name', required: true, labelKey: 'fieldName', synonyms: ['name', 'nome', 'kpi', 'metrica', 'metric'] },
    { key: 'value', required: true, labelKey: 'fieldValue', synonyms: ['value', 'valore', 'importo', 'amount'] },
    { key: 'unit', required: false, labelKey: 'fieldUnit', synonyms: ['unit', 'unita', 'unità', 'measure', 'misura'] },
    { key: 'target', required: false, labelKey: 'fieldTarget', synonyms: ['target', 'obiettivo', 'goal'] },
  ],
  schema: z.object({
    name: requiredString,
    value: numberLike,
    unit: optionalString,
    target: optionalNumber,
  }),
};

const COMPETITORS: ImportTarget = {
  key: 'competitors',
  labelKey: 'targetCompetitors',
  descriptionKey: 'targetCompetitorsDesc',
  fields: [
    { key: 'name', required: true, labelKey: 'fieldName', synonyms: ['name', 'nome', 'company', 'azienda'] },
    { key: 'website', required: false, labelKey: 'fieldWebsite', synonyms: ['website', 'sito', 'url', 'web', 'site'] },
    { key: 'description', required: false, labelKey: 'fieldDescription', synonyms: ['description', 'descrizione', 'desc', 'note'] },
    { key: 'estimatedRevenue', required: false, labelKey: 'fieldEstimatedRevenue', synonyms: ['estimatedrevenue', 'estimated_revenue', 'revenue', 'ricavi', 'fatturato'] },
    { key: 'employees', required: false, labelKey: 'fieldEmployees', synonyms: ['employees', 'dipendenti', 'staff', 'team', 'headcount'] },
    { key: 'marketShare', required: false, labelKey: 'fieldMarketShare', synonyms: ['marketshare', 'market_share', 'quotamercato', 'quota_mercato', 'share'] },
  ],
  schema: z.object({
    name: requiredString,
    website: optionalString,
    description: optionalString,
    estimatedRevenue: optionalNumber,
    employees: optionalInt,
    marketShare: optionalNumber,
  }),
};

// ── Scadenzario and spese ricorrenti ────────────────────────────────────────
// Same parsers as the movements (Italian amounts, GG/MM/AAAA dates), plus the
// Italian words people actually type in these two lists.

/** Lower-cased, trimmed, inner spaces collapsed: "Da  Incassare " → "da incassare". */
function word(v: unknown): string {
  return String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Empty is allowed; anything else must be a real date (same parser as requiredDate). */
const optionalDate = z.preprocess((v) => (v === null || v === '' ? undefined : v), requiredDate.optional());

/** Optional email, checked like the manual form does (api/receivables). */
const optionalEmail = z.preprocess(
  (v) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v).trim()),
  z.string().email('Email non valida').max(320).optional(),
);

/** Receivable status: open or paid. "Scaduta" is an open invoice past its due
 *  date — the product derives OVERDUE from the due date, it is never stored. */
const RECEIVABLE_OPEN = ['aperta', 'aperto', 'da incassare', 'non pagata', 'non pagato', 'insoluta', 'insoluto', 'scaduta', 'scaduto', 'open', 'unpaid', 'overdue'];
const RECEIVABLE_PAID = ['pagata', 'pagato', 'incassata', 'incassato', 'saldata', 'saldato', 'paid'];
const receivableStatus = z.preprocess((v) => {
  const s = word(v);
  if (s === '' || RECEIVABLE_OPEN.includes(s)) return 'OPEN';
  if (RECEIVABLE_PAID.includes(s)) return 'PAID';
  return s;
}, z.enum(['OPEN', 'PAID'], { errorMap: () => ({ message: "Stato non riconosciuto: usa 'aperta' oppure 'pagata'" }) }));

/** Recurring-expense frequency: the five cadences the product knows (EXPENSE_FREQUENCIES). */
const FREQUENCY_WORDS: Record<string, (typeof EXPENSE_FREQUENCIES)[number]> = {
  mensile: 'MONTHLY', 'ogni mese': 'MONTHLY', mese: 'MONTHLY', monthly: 'MONTHLY',
  bimestrale: 'BIMONTHLY', 'ogni due mesi': 'BIMONTHLY', bimonthly: 'BIMONTHLY',
  trimestrale: 'QUARTERLY', 'ogni tre mesi': 'QUARTERLY', quarterly: 'QUARTERLY',
  semestrale: 'SEMIANNUAL', 'ogni sei mesi': 'SEMIANNUAL', semiannual: 'SEMIANNUAL', 'half-yearly': 'SEMIANNUAL',
  annuale: 'YEARLY', annua: 'YEARLY', annuo: 'YEARLY', 'ogni anno': 'YEARLY', anno: 'YEARLY', yearly: 'YEARLY', annual: 'YEARLY',
};
const expenseFrequency = z.preprocess((v) => {
  const s = word(v);
  if (s === '') return 'MONTHLY';
  return FREQUENCY_WORDS[s] ?? s;
}, z.enum(EXPENSE_FREQUENCIES, {
  errorMap: () => ({ message: "Frequenza non riconosciuta: usa mensile, bimestrale, trimestrale, semestrale o annuale" }),
}));

const RECEIVABLES: ImportTarget = {
  key: 'receivables',
  labelKey: 'targetReceivables',
  descriptionKey: 'targetReceivablesDesc',
  fields: [
    { key: 'customerName', required: true, labelKey: 'fieldCustomerName', synonyms: ['customer', 'customername', 'cliente', 'nomecliente', 'ragionesociale', 'debitore', 'intestatario'] },
    { key: 'customerEmail', required: false, labelKey: 'fieldCustomerEmail', synonyms: ['email', 'e-mail', 'mail', 'emailcliente', 'indirizzoemail'] },
    { key: 'invoiceNumber', required: false, labelKey: 'fieldInvoiceNumber', synonyms: ['invoice', 'invoicenumber', 'numerofattura', 'nfattura', 'nrfattura', 'numfattura', 'fattura', 'numerodocumento', 'documento'] },
    { key: 'amount', required: true, labelKey: 'fieldAmount', synonyms: ['amount', 'importo', 'totale', 'importofattura', 'totalefattura', 'daincassare', 'valore'] },
    { key: 'issuedDate', required: false, labelKey: 'fieldIssuedDate', synonyms: ['issueddate', 'issuedate', 'dataemissione', 'datafattura', 'emissione', 'datadocumento'] },
    { key: 'dueDate', required: true, labelKey: 'fieldDueDate', synonyms: ['duedate', 'scadenza', 'datascadenza', 'scadeil', 'datadiscadenza'] },
    { key: 'status', required: false, labelKey: 'fieldStatus', synonyms: ['status', 'stato', 'statopagamento', 'pagata', 'pagato'] },
    { key: 'notes', required: false, labelKey: 'fieldNotes', synonyms: ['notes', 'note', 'annotazioni', 'commento', 'commenti'] },
  ],
  schema: z.object({
    customerName: requiredString.pipe(z.string().max(200)),
    customerEmail: optionalEmail,
    invoiceNumber: optionalString.pipe(z.string().max(100).optional()),
    amount: positiveAmount,
    issuedDate: optionalDate,
    dueDate: requiredDate,
    status: receivableStatus,
    notes: optionalString.pipe(z.string().max(2000).optional()),
  }),
};

const RECURRING_EXPENSES: ImportTarget = {
  key: 'recurring_expenses',
  labelKey: 'targetRecurring',
  descriptionKey: 'targetRecurringDesc',
  fields: [
    { key: 'vendorName', required: true, labelKey: 'fieldVendorName', synonyms: ['vendor', 'vendorname', 'supplier', 'fornitore', 'nomefornitore', 'beneficiario', 'servizio'] },
    { key: 'amount', required: true, labelKey: 'fieldAmount', synonyms: ['amount', 'importo', 'costo', 'canone', 'valore', 'totale'] },
    { key: 'frequency', required: false, labelKey: 'fieldFrequency', synonyms: ['frequency', 'frequenza', 'periodicita', 'cadenza', 'ricorrenza'] },
    { key: 'category', required: false, labelKey: 'fieldCategory', synonyms: ['category', 'categoria', 'tipologia', 'voce'] },
    { key: 'nextRenewal', required: false, labelKey: 'fieldNextRenewal', synonyms: ['nextrenewal', 'prossimorinnovo', 'rinnovo', 'prossimascadenza', 'prossimopagamento', 'scadenza'] },
    { key: 'notes', required: false, labelKey: 'fieldNotes', synonyms: ['notes', 'note', 'annotazioni', 'commento', 'commenti'] },
  ],
  schema: z.object({
    vendorName: requiredString.pipe(z.string().max(200)),
    amount: positiveAmount,
    frequency: expenseFrequency,
    category: optionalString.pipe(z.string().max(100).optional()),
    nextRenewal: optionalDate,
    notes: optionalString.pipe(z.string().max(2000).optional()),
  }),
};

const CUSTOMER_STATS: ImportTarget = {
  key: 'customer_stats',
  labelKey: 'targetCustomerStats',
  descriptionKey: 'targetCustomerStatsDesc',
  fields: [
    { key: 'period', required: true, labelKey: 'fieldPeriod', synonyms: ['period', 'periodo', 'mese', 'month', 'data', 'date'] },
    { key: 'activeCustomers', required: true, labelKey: 'fieldActiveCustomers', synonyms: ['active', 'activecustomers', 'active_customers', 'attivi', 'clientiattivi', 'clienti_attivi'] },
    { key: 'newCustomers', required: true, labelKey: 'fieldNewCustomers', synonyms: ['new', 'newcustomers', 'new_customers', 'nuovi', 'nuoviclienti', 'nuovi_clienti'] },
    { key: 'churnedCustomers', required: true, labelKey: 'fieldChurnedCustomers', synonyms: ['churn', 'churned', 'churnedcustomers', 'churned_customers', 'persi', 'clientipersi', 'clienti_persi'] },
  ],
  schema: z.object({
    period: requiredString,
    activeCustomers: requiredInt,
    newCustomers: requiredInt,
    churnedCustomers: requiredInt,
  }),
};

export const IMPORT_TARGETS: ImportTarget[] = [
  FINANCIAL_RECORDS,
  KPIS,
  COMPETITORS,
  CUSTOMER_STATS,
  RECEIVABLES,
  RECURRING_EXPENSES,
];

/**
 * "You picked the wrong type": another type this file clearly belongs to, or
 * null. Clearly means: with the automatic column suggestion, the chosen type
 * is missing at least one REQUIRED column while the other type has all of
 * its required columns. Among several, the one that recognises most columns.
 * A file that fits no type (or fits the chosen one) gets no suggestion.
 */
export function suggestBetterTarget(sourceColumns: string[], currentKey: ImportTargetKey): ImportTargetKey | null {
  const fit = (t: ImportTarget) => {
    const mapped = new Set(Object.values(suggestMapping(sourceColumns, t)).filter(Boolean) as string[]);
    return { complete: t.fields.every((f) => !f.required || mapped.has(f.key)), recognised: mapped.size };
  };
  const current = getImportTarget(currentKey);
  if (!current || fit(current).complete) return null;
  let best: { key: ImportTargetKey; recognised: number } | null = null;
  for (const t of IMPORT_TARGETS) {
    if (t.key === currentKey) continue;
    const f = fit(t);
    if (f.complete && (!best || f.recognised > best.recognised)) best = { key: t.key, recognised: f.recognised };
  }
  return best?.key ?? null;
}

export function getImportTarget(key: string): ImportTarget | undefined {
  return IMPORT_TARGETS.find((t) => t.key === key);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s_\-./]+/g, '');
}

/**
 * Auto-suggest mapping: for each source column, find a target field whose key
 * or synonyms match (case-insensitive, normalized).
 */
export function suggestMapping(
  sourceColumns: string[],
  target: ImportTarget,
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  const usedFields = new Set<string>();
  for (const col of sourceColumns) {
    const normCol = normalize(col);
    let matched: string | null = null;
    for (const f of target.fields) {
      if (usedFields.has(f.key)) continue;
      const all = [f.key, ...f.synonyms].map(normalize);
      if (all.includes(normCol)) {
        matched = f.key;
        break;
      }
    }
    if (!matched) {
      // looser match: any synonym starts with col or vice versa
      for (const f of target.fields) {
        if (usedFields.has(f.key)) continue;
        const all = [f.key, ...f.synonyms].map(normalize);
        if (all.some((s) => s.includes(normCol) || normCol.includes(s))) {
          matched = f.key;
          break;
        }
      }
    }
    if (matched) usedFields.add(matched);
    result[col] = matched;
  }
  return result;
}
