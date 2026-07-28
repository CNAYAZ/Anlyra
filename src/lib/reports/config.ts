import {
  reportConfigSchema,
  type ReportConfig,
  type ReportSection,
} from './types';
import type { ReportSectionKey } from '@/lib/report-sections';

/**
 * Bridge between the TWO section vocabularies that exist in this codebase:
 *
 *   • ReportSectionKey (src/lib/report-sections.ts) — what the live builder at
 *     /reports/builder shows and what Report_b8.sections stores.
 *   • ReportSection (src/lib/reports/types.ts) — what the PDF template renders.
 *
 * Keys that map to nothing the PDF can fill from REAL data are deliberately
 * absent: 'top_customers' and 'churn_overview' have no counterpart in
 * ReportPayload, and 'benchmarks' would need industry averages that are not in
 * the database. Per the founder's rule, a section we cannot fill with real
 * numbers is OMITTED, never invented.
 */
const SECTION_BRIDGE: Partial<Record<ReportSectionKey, ReportSection>> = {
  kpi_summary: 'executive',
  revenue_breakdown: 'finance',
  cost_breakdown: 'finance',
  cashflow_trend: 'cashflow',
  forecast_3m: 'projections',
};

/** Stored section keys → PDF sections, de-duplicated, order preserved. */
export function bridgeSections(storedSections: string[]): ReportSection[] {
  const out: ReportSection[] = [];
  for (const key of storedSections) {
    const mapped = SECTION_BRIDGE[key as ReportSectionKey];
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

/**
 * The ReportConfig for a stored report. Prefers the JSON persisted in
 * Report_b8.config; falls back to a config derived from `sections` for rows
 * created before that column existed (period/language/charts are defaults, and
 * the report says so rather than pretending the user chose them).
 */
export function resolveReportConfig(row: {
  title: string;
  sections: string;
  config: string | null;
}): ReportConfig | null {
  if (row.config) {
    const parsed = reportConfigSchema.safeParse(safeJson(row.config));
    if (parsed.success) return parsed.data;
    // Corrupt/outdated stored config: fall through to the derived one rather
    // than failing the whole render.
  }

  const sections = bridgeSections(safeJson(row.sections) as string[]);
  if (sections.length === 0) return null; // nothing the PDF can render

  const derived = {
    type: 'custom' as const,
    period: '12m' as const,
    sections,
    language: 'it' as const,
    includeCharts: true,
    title: row.title,
  };
  const parsed = reportConfigSchema.safeParse(derived);
  return parsed.success ? parsed.data : null;
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
