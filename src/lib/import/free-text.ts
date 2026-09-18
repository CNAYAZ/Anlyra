/**
 * Does the column mapped to CATEGORY actually contain a category, or the free
 * text of a bank statement?
 *
 * ── WHY THIS EXISTS ──
 * `suggestMapping` lists 'descrizione' and 'causale' among the synonyms of the
 * `category` field (src/lib/import-targets.ts). On a real Italian bank export —
 * Data / Descrizione / Dare / Avere — that makes "Descrizione" land on
 * "Categoria", and the file then passes validation with ZERO errors while every
 * single movement becomes its own category ("Pagamento fornitore ACME",
 * "Bolletta luce", …). Nothing downstream can recover from that: the analytics
 * pages derive categories by splitting financialRecord.description on '/', so
 * they end up with one bucket per movement instead of a handful of real
 * categories. The import looks like a success and the damage only shows up
 * weeks later, in the reports.
 *
 * ── WHY A SHAPE TEST AND NOT A COLUMN-NAME TEST ──
 * Taking 'descrizione' out of the synonym list would fix that one column NAME
 * and nothing else: a bank that calls the column "Movimento", "Operazione" or
 * "Dettaglio" produces exactly the same damage, and a file whose column really
 * is called "Descrizione" but really does hold categories would stop being
 * recognized at all — leaving `category` unmapped, which fails EVERY row, i.e.
 * breaking an import that works today. This looks at the VALUES instead, so it
 * catches the problem whatever the column is called and changes no mapping.
 *
 * ── THE THRESHOLDS ARE MEASURED, NOT GUESSED ──
 * Both fixtures in this repository were measured before these numbers were
 * chosen:
 *   • fixtures/import-sample.csv (real categories): 10 distinct values out of
 *     19, ratio 0.53, 1.00 words per value on average.
 *   • fixtures/movimenti_bancari_esempio.csv (bank free text): 10 distinct out
 *     of 10, ratio 1.00, 2.50 words per value on average.
 * The rule below sits far from both, on two independent axes, so it separates
 * them by shape and not by being tuned to these two files.
 *
 * A minimum of 8 values is required: on a 3-row file "every value different"
 * says nothing at all, and warning there would be noise.
 */

/** Almost every row a different value. */
const MIN_DISTINCT_RATIO = 0.9;
/** Free text is made of several words; a category is usually one. */
const MIN_AVG_WORDS = 1.5;
/** Below this, "all values different" carries no information. */
const MIN_VALUES = 8;

export type FreeTextReport = {
  /** True when the column looks like free text rather than a category. */
  suspect: boolean;
  /** Non-empty values examined. */
  valueCount: number;
  /** Distinct values (case-insensitive) among them. */
  distinctCount: number;
  /** A few real values, to show the customer what the column actually holds. */
  samples: string[];
};

export function analyzeCategoryColumn(rawValues: unknown[]): FreeTextReport {
  const values = rawValues
    .map((v) => (v === null || v === undefined ? '' : String(v).trim()))
    .filter((v) => v !== '');

  const distinct = new Set(values.map((v) => v.toLowerCase()));
  const report: FreeTextReport = {
    suspect: false,
    valueCount: values.length,
    distinctCount: distinct.size,
    samples: [...distinct].slice(0, 3),
  };

  if (values.length < MIN_VALUES) return report;

  const distinctRatio = distinct.size / values.length;
  const avgWords =
    values.reduce((sum, v) => sum + v.split(/\s+/).filter(Boolean).length, 0) / values.length;

  report.suspect = distinctRatio >= MIN_DISTINCT_RATIO && avgWords >= MIN_AVG_WORDS;
  return report;
}
