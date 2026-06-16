/**
 * Test offline del generatore di solleciti.
 *
 *   npx tsx scripts/test-reminders.ts
 */
import { generateReminders, suggestTone } from '../src/lib/reminders/generate';

const SEP = '─'.repeat(64);

// Anchor "now" so output is deterministic regardless of when the script runs.
const NOW = new Date('2026-06-16T12:00:00');

// ── Scenario 1: fattura NON ancora scaduta, nessun tono → solo 'cortese' ───
console.log('\n' + SEP);
console.log('SCENARIO 1 — Pre-scadenza (scadenza tra 3 giorni), nessun tono');
console.log('             Atteso: UNA sola variante (cortese)');
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
console.log(`\nVarianti generate: ${s1.variants.length} (atteso: 1)`);
for (const v of s1.variants) {
  console.log(`\n[TONO: ${v.tone}] giorni scaduta: ${v.daysOverdue} | suggerita per: ${v.suggestedSendAt.toISOString().slice(0, 10)}`);
  console.log(`OGGETTO: ${v.subject}`);
  console.log('CORPO:\n' + v.body);
}

// ── Scenario 2: fattura pre-scadenza, tono esplicito 'fermo' ────────────────
console.log('\n' + SEP);
console.log('SCENARIO 2 — Pre-scadenza, tono esplicito FERMO');
console.log('             Atteso: linguaggio futuro, NO "scaduta"');
console.log(SEP);

const s2 = generateReminders(
  {
    customerName: 'Bianchi Costruzioni S.p.A.',
    amount: 3800,
    invoiceNumber: 'FT-2026-0038',
    dueAt: new Date('2026-06-19'),
    tone: 'fermo',
  },
  NOW,
);
for (const v of s2.variants) {
  console.log(`\n[TONO: ${v.tone}] giorni scaduta: ${v.daysOverdue}`);
  console.log(`OGGETTO: ${v.subject}`);
  console.log('CORPO:\n' + v.body);
}

// ── Scenario 3: fattura scaduta da 5 giorni, tono neutro ────────────────────
console.log('\n' + SEP);
console.log('SCENARIO 3 — Scaduta da 5 giorni, tono NEUTRO');
console.log(SEP);

const s3 = generateReminders(
  {
    customerName: 'Verdi Logistica S.r.l.',
    amount: 12750.5,
    invoiceNumber: 'FT-2026-0031',
    dueAt: new Date('2026-06-11'),
    tone: 'neutro',
  },
  NOW,
);
for (const v of s3.variants) {
  console.log(`\n[TONO: ${v.tone}] giorni scaduta: ${v.daysOverdue}`);
  console.log(`OGGETTO: ${v.subject}`);
  console.log('CORPO:\n' + v.body);
}

// ── Scenario 4: scaduta da 18 giorni, tono fermo ────────────────────────────
console.log('\n' + SEP);
console.log('SCENARIO 4 — Scaduta da 18 giorni, tono FERMO');
console.log('             Atteso: NO "precedenti solleciti", saldo entro 7 gg');
console.log(SEP);

const s4 = generateReminders(
  {
    customerName: 'Neri Forniture S.p.A.',
    amount: 6500,
    invoiceNumber: 'FT-2026-0021',
    dueAt: new Date('2026-05-29'),
    tone: 'fermo',
  },
  NOW,
);
for (const v of s4.variants) {
  console.log(`\n[TONO: ${v.tone}] giorni scaduta: ${v.daysOverdue}`);
  console.log(`OGGETTO: ${v.subject}`);
  console.log('CORPO:\n' + v.body);
}

// ── Scenario 5: scaduta da 45 giorni, sollecito_finale ──────────────────────
console.log('\n' + SEP);
console.log('SCENARIO 5 — Scaduta da 45 giorni, SOLLECITO FINALE');
console.log('             Atteso: fermo, NO minacce legali, chiusura "Distinti saluti"');
console.log(SEP);

const s5 = generateReminders(
  {
    customerName: 'Esposito & Partner',
    amount: 875,
    currency: 'USD',
    dueAt: new Date('2026-05-02'),
    tone: 'sollecito_finale',
  },
  NOW,
);
for (const v of s5.variants) {
  console.log(`\n[TONO: ${v.tone}] giorni scaduta: ${v.daysOverdue}`);
  console.log(`OGGETTO: ${v.subject}`);
  console.log('CORPO:\n' + v.body);
}

// ── Scenario 6: scaduta da 10 giorni, nessun tono → tutti 4 toni ────────────
console.log('\n' + SEP);
console.log('SCENARIO 6 — Scaduta da 10 giorni, nessun tono → tutti 4 toni');
console.log(SEP);

const s6 = generateReminders(
  {
    customerName: 'Ferrari Consulting',
    amount: 2200,
    invoiceNumber: 'FT-2026-0055',
    dueAt: new Date('2026-06-06'),
  },
  NOW,
);
console.log(`\nVarianti generate: ${s6.variants.length} (atteso: 4)`);
for (const v of s6.variants) {
  console.log(`\n[TONO: ${v.tone}] giorni scaduta: ${v.daysOverdue} | suggerita per: ${v.suggestedSendAt.toISOString().slice(0, 10)}`);
  console.log(`OGGETTO: ${v.subject}`);
  console.log('CORPO:\n' + v.body);
}

// ── Scenario 7: suggestTone ──────────────────────────────────────────────────
console.log('\n' + SEP);
console.log('SCENARIO 7 — suggestTone per varie scadenze');
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

// ── Scenario 8: validazione input ────────────────────────────────────────────
console.log('\n' + SEP);
console.log('SCENARIO 8 — Validazione input (errori attesi)');
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

// ── Guardia: nessun testo deve contenere minacce legali ─────────────────────
console.log('\n' + SEP);
console.log('GUARDIA — Ricerca parole vietate in tutti i testi generati');
console.log(SEP);

const FORBIDDEN = ['vie legali', 'recupero del credito', 'azione legale', 'tribunale', 'avvocato', 'diffida'];
const allVariants = [s1, s2, s3, s4, s5, s6].flatMap((s) => s.variants);
let guardiaPassed = true;
for (const v of allVariants) {
  for (const word of FORBIDDEN) {
    if (v.body.toLowerCase().includes(word) || v.subject.toLowerCase().includes(word)) {
      console.log(`  VIOLAZIONE [${v.tone}]: trovato "${word}"`);
      guardiaPassed = false;
    }
  }
}
if (guardiaPassed) console.log('  OK — nessuna parola vietata trovata');

console.log('\n' + SEP);
console.log('TEST COMPLETATO');
console.log(SEP + '\n');
