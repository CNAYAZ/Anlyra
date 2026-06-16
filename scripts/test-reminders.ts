/**
 * Test offline del generatore di solleciti.
 *
 *   npx tsx scripts/test-reminders.ts
 */
import { generateReminders, suggestTone } from '../src/lib/reminders/generate';

const SEP = '─'.repeat(64);

// Anchor "now" so output is deterministic regardless of when the script runs.
const NOW = new Date('2026-06-16T12:00:00');

// ── Scenario 1: fattura non ancora scaduta, nessun tono specificato ──────────
console.log('\n' + SEP);
console.log('SCENARIO 1 — Pre-scadenza (scadenza tra 3 giorni), tutti i toni');
console.log(SEP);

const s1 = generateReminders(
  {
    customerName: 'Rossi & Figli S.r.l.',
    amount: 4250.0,
    currency: 'EUR',
    invoiceNumber: 'FT-2026-0042',
    dueAt: new Date('2026-06-19'),
  },
  NOW,
);

for (const v of s1.variants) {
  console.log(`\n[TONO: ${v.tone}] giorni scaduta: ${v.daysOverdue} | suggerita per: ${v.suggestedSendAt.toISOString().slice(0, 10)}`);
  console.log(`OGGETTO: ${v.subject}`);
  console.log('CORPO:\n' + v.body);
}

// ── Scenario 2: fattura scaduta da 5 giorni, tono 'neutro' ──────────────────
console.log('\n' + SEP);
console.log('SCENARIO 2 — Scaduta da 5 giorni, tono neutro');
console.log(SEP);

const s2 = generateReminders(
  {
    customerName: 'Bianchi Costruzioni S.p.A.',
    amount: 12750.50,
    invoiceNumber: 'FT-2026-0031',
    dueAt: new Date('2026-06-11'),
    tone: 'neutro',
  },
  NOW,
);
const v2 = s2.variants[0];
console.log(`\n[TONO: ${v2.tone}] giorni scaduta: ${v2.daysOverdue}`);
console.log(`OGGETTO: ${v2.subject}`);
console.log('CORPO:\n' + v2.body);

// ── Scenario 3: scaduta da 45 giorni, sollecito_finale ───────────────────────
console.log('\n' + SEP);
console.log('SCENARIO 3 — Scaduta da 45 giorni, sollecito finale');
console.log(SEP);

const s3 = generateReminders(
  {
    customerName: 'Verdi Logistics',
    amount: 875,
    currency: 'USD',
    dueAt: new Date('2026-05-02'),
    tone: 'sollecito_finale',
  },
  NOW,
);
const v3 = s3.variants[0];
console.log(`\n[TONO: ${v3.tone}] giorni scaduta: ${v3.daysOverdue}`);
console.log(`OGGETTO: ${v3.subject}`);
console.log('CORPO:\n' + v3.body);

// ── Scenario 4: suggestTone ──────────────────────────────────────────────────
console.log('\n' + SEP);
console.log('SCENARIO 4 — suggestTone per varie scadenze');
console.log(SEP);

const cases: [string, Date][] = [
  ['tra 5 giorni  (pre-scadenza)',   new Date('2026-06-21')],
  ['scaduta oggi',                   new Date('2026-06-16')],
  ['scaduta da 3 giorni',            new Date('2026-06-13')],
  ['scaduta da 15 giorni',           new Date('2026-06-01')],
  ['scaduta da 40 giorni',           new Date('2026-05-07')],
];
for (const [label, due] of cases) {
  console.log(`  ${label.padEnd(32)} → ${suggestTone(due, NOW)}`);
}

// ── Scenario 5: validazione input ────────────────────────────────────────────
console.log('\n' + SEP);
console.log('SCENARIO 5 — Validazione input (errori attesi)');
console.log(SEP);

const badCases: [string, () => void][] = [
  ['customerName vuoto', () => generateReminders({ customerName: '', amount: 100, dueAt: new Date() })],
  ['amount negativo',    () => generateReminders({ customerName: 'X', amount: -50, dueAt: new Date() })],
  ['dueAt non valida',   () => generateReminders({ customerName: 'X', amount: 100, dueAt: new Date('NOT_A_DATE') })],
];

for (const [label, fn] of badCases) {
  try {
    fn();
    console.log(`  ${label}: MANCATO errore (BUG)`);
  } catch (e) {
    console.log(`  ${label}: OK — ${(e as Error).message}`);
  }
}

console.log('\n' + SEP);
console.log('TEST COMPLETATO');
console.log(SEP + '\n');
