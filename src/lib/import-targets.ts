import { z } from 'zod';

export type ImportTargetKey =
  | 'financial_records'
  | 'kpis'
  | 'competitors'
  | 'customer_stats';

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

const numberLike = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(/[€$£\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}, z.number());

const optionalNumber = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(/[€$£\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}, z.number().optional());

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

const dateLike = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  if (v instanceof Date) return v.toISOString();
  const s = String(v).trim();
  // Try ISO first
  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  // Try DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const [, dd, mm, yy] = m;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}, z.string());

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
  if (['expense', 'cost', 'costo', 'costi', 'uscita', 'uscite', 'out'].includes(s)) return 'EXPENSE';
  return s.toUpperCase();
}, z.enum(['REVENUE', 'EXPENSE']));

const FINANCIAL_RECORDS: ImportTarget = {
  key: 'financial_records',
  labelKey: 'targetFinancial',
  descriptionKey: 'targetFinancialDesc',
  fields: [
    { key: 'amount', required: true, labelKey: 'fieldAmount', synonyms: ['amount', 'importo', 'valore', 'value', 'totale', 'total', 'somma', 'sum'] },
    { key: 'type', required: true, labelKey: 'fieldType', synonyms: ['type', 'tipo', 'kind', 'categoria_movimento'] },
    { key: 'occurredAt', required: true, labelKey: 'fieldOccurredAt', synonyms: ['date', 'data', 'occurredat', 'occurred_at', 'datamovimento', 'datadocumento', 'when'] },
    { key: 'description', required: false, labelKey: 'fieldDescription', synonyms: ['description', 'descrizione', 'desc', 'note', 'notes', 'memo'] },
    { key: 'source', required: false, labelKey: 'fieldSource', synonyms: ['source', 'fonte', 'origine', 'channel', 'canale'] },
  ],
  schema: z.object({
    amount: numberLike,
    type: typeEnum,
    occurredAt: dateLike,
    description: optionalString,
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
];

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
