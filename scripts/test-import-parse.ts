/**
 * Prova funzionale OFFLINE del parser + validatore dell'import.
 * Esegue parsing CSV, auto-mapping e validazione sulla fixture, SENZA DB.
 *
 *   npx tsx scripts/test-import-parse.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCsv } from '../src/lib/import/parse';
import { validateRows, buildFinancialDescription } from '../src/lib/import/validate';
import { getImportTarget, suggestMapping } from '../src/lib/import-targets';

const fixturePath = join(__dirname, '..', 'fixtures', 'import-sample.csv');
const buf = readFileSync(fixturePath);

const target = getImportTarget('financial_records');
if (!target) throw new Error('target financial_records non trovato');

const { columns, rows } = parseCsv(buf);
console.log('── PARSING ─────────────────────────────────────────────');
console.log(`colonne rilevate : ${columns.join(', ')}`);
console.log(`righe dati       : ${rows.length}`);

const mapping = suggestMapping(columns, target);
console.log('\n── AUTO-MAPPING ────────────────────────────────────────');
for (const [col, field] of Object.entries(mapping)) {
  console.log(`  ${col.padEnd(16)} → ${field ?? '(ignorata)'}`);
}

const { validRows, errors } = validateRows(target, mapping, rows);
console.log('\n── VALIDAZIONE ─────────────────────────────────────────');
console.log(`righe valide     : ${validRows.length}`);
console.log(`righe scartate   : ${new Set(errors.map((e) => e.row)).size}`);

if (errors.length > 0) {
  console.log('\nerrori riga per riga:');
  for (const e of errors) {
    console.log(`  riga ${String(e.row).padStart(2)} [${e.field ?? '-'}] ${e.message}`);
  }
}

console.log('\n── ANTEPRIMA RECORD CHE VERREBBERO SCRITTI ─────────────');
console.log('(financialRecord: type | amount | occurredAt | description | source)');
for (const r of validRows) {
  const desc = buildFinancialDescription(r);
  const date = String(r.occurredAt).slice(0, 10);
  console.log(
    `  ${String(r.type).padEnd(7)} | ${String(r.amount).padStart(8)} | ${date} | ${desc.padEnd(26)} | ${r.source ?? 'import'}`,
  );
}

// Guardia formato description: ogni record deve essere 'categoria/sottocategoria' o 'categoria'
const badDesc = validRows
  .map((r) => buildFinancialDescription(r))
  .filter((d) => !/^[^/]+(\/[^/]+)?$/.test(d));
console.log('\n── GUARDIA FORMATO description ─────────────────────────');
console.log(badDesc.length === 0 ? 'OK: tutti i record rispettano categoria[/sottocategoria]' : `VIOLAZIONI: ${badDesc.join(', ')}`);
