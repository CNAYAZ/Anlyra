import { prisma } from '@/lib/prisma';
import {
  daysInAppMonth,
  fromAppWallClock,
  shiftAppMonth,
  toAppDateString,
  toAppWallClock,
} from '@/lib/timezone';

/**
 * THE DEMO'S DATA, ALWAYS RECENT (founder's decision).
 *
 * The demo company's data used to be written once, at the first visit, with
 * dates ending in that month — and the pages and the AI read against today,
 * so the most recent months emptied out as time went by. Now, at the first
 * demo visit of every Italian calendar month, the demo company's movements
 * (last 15 months up to the current one), receivables, recurring expenses and
 * customer statistics are rewritten: always the SAME story, only moved in
 * time. No randomness: the same month gives the same rows.
 *
 * ── ONLY THE DEMO COMPANY, CHECKED BY ID ──
 * Every query below uses DEMO_ORG, a literal in this file, never an argument;
 * the caller's id is only compared with it, and anything else is refused before
 * a single query runs. There is no code path here that names another company.
 *
 * ── ONCE PER MONTH, EVEN WITH TWO VISITS AT THE SAME INSTANT ──
 * Every movement carries externalId "demo:<YYYY-MM>:<n>". The rewrite runs in a
 * transaction that first takes a Postgres advisory lock and then checks that
 * marker again: a second visit waits for the first, finds the month already
 * written and does nothing.
 */
const DEMO_ORG = 'demo-org';
const MONTHS = 15;
const LOCK_KEY = 'anlyra:demo-data';

const markerPrefix = (month: string) => `demo:${month}:`;

/** Month already verified in this server instance: no query on every page. */
let verifiedMonth: string | null = null;

// ── THE STORY ──────────────────────────────────────────────────────────────
// An Italian business-services company, 10 people and then 11. Amounts in EUR
// per month. "age" = months before the current one (0 = current month).

/** The hire and the two new subscriptions start this many months ago: the latest quarter. */
const CHANGE_AGE = 2;

const SOFTWARE: { vendor: string; amount: number; day: number; since: 'always' | 'recent' }[] = [
  { vendor: 'Fattura Facile Cloud', amount: 700, day: 3, since: 'always' },
  { vendor: 'Ufficio Suite', amount: 550, day: 5, since: 'always' },
  { vendor: 'Archivia Documenti', amount: 350, day: 8, since: 'always' },
  { vendor: 'BackupSicuro', amount: 200, day: 12, since: 'always' },
  { vendor: 'FirmaPiù', amount: 200, day: 15, since: 'always' },
  // The two new subscriptions of the latest quarter.
  { vendor: 'Clientela CRM', amount: 1450, day: 18, since: 'recent' },
  { vendor: 'Progetti Pro', amount: 950, day: 22, since: 'recent' },
];

/** Fixed costs that are also recurring expenses (same vendor, same amount, same day). */
const FIXED: { category: string; vendor: string; amount: number; day: number }[] = [
  { category: 'affitto', vendor: 'Immobiliare Duomo Srl', amount: 4000, day: 5 },
  { category: 'utenze', vendor: 'Energia Chiara', amount: 800, day: 20 },
  { category: 'utenze', vendor: 'TeleRete', amount: 400, day: 11 },
  { category: 'consulenze', vendor: 'Studio Marini Commercialisti', amount: 1200, day: 10 },
  { category: 'consulenze', vendor: 'Studio Legale Ferraris', amount: 600, day: 25 },
];

// Small month-to-month movements, by age, so the series do not look drawn with a ruler.
const VAR_MATERIALS = [1.0, 0.98, 1.03, 1.01, 0.97, 1.02, 0.99, 1.04, 0.98, 1.01, 0.97, 1.02, 1.0, 0.99, 1.03];
const VAR_MARKETING = [1.02, 0.97, 1.01, 1.03, 0.98, 1.0, 0.96, 1.04, 1.01, 0.99, 1.02, 0.97, 1.03, 1.0, 0.98];
const VAR_TRAVEL = [0.95, 1.05, 1.0, 0.9, 1.1, 1.0, 1.05, 0.95, 1.0, 1.1, 0.9, 1.0, 1.05, 0.95, 1.0];

/** New and lost customers by age; 5 months ago a month of high churn. */
const NEW_CUSTOMERS = [2, 3, 3, 4, 3, 2, 3, 2, 4, 3, 2, 3, 4, 2, 3];
const CHURNED_CUSTOMERS = [1, 0, 1, 1, 0, 6, 1, 0, 1, 1, 0, 1, 0, 1, 1];
const ACTIVE_CUSTOMERS_15_MONTHS_AGO = 38;

/** Consulting and training follow the Italian year: August is weak, December and January a little. */
function consultingSeason(month: number): number {
  return month === 8 ? 0.25 : month === 12 ? 0.88 : month === 1 ? 0.92 : 1;
}
function trainingSeason(month: number): number {
  return month === 8 ? 0 : month === 7 ? 0.8 : month === 12 ? 0.7 : 1;
}

type Month = { year: number; month: number; age: number; key: string };

export type DemoStory = {
  month: string;
  records: {
    organizationId: string;
    type: 'REVENUE' | 'COST';
    amount: number;
    currency: string;
    description: string;
    source: string;
    occurredAt: Date;
    externalId: string;
  }[];
  receivables: {
    organizationId: string;
    customerName: string;
    customerEmail: string;
    amount: number;
    currency: string;
    invoiceNumber: string;
    issuedDate: Date;
    dueDate: Date;
    status: 'OPEN' | 'PAID';
    paidAt: Date | null;
    createdAt: Date;
  }[];
  recurringExpenses: {
    organizationId: string;
    vendorName: string;
    amount: number;
    currency: string;
    frequency: 'MONTHLY';
    category: string;
    nextRenewal: Date;
    active: boolean;
    createdAt: Date;
  }[];
  customerStats: {
    organizationId: string;
    period: string;
    activeCustomers: number;
    newCustomers: number;
    churnedCustomers: number;
  }[];
};

/**
 * The whole story for the Italian month `now` falls in. Pure: no database, no
 * randomness — the same month always gives exactly the same rows.
 */
export function buildDemoStory(now: Date): DemoStory {
  const today = toAppWallClock(now);
  const month = toAppDateString(now).slice(0, 7);

  const at = (m: { year: number; month: number }, day: number, hour = 10) =>
    fromAppWallClock({
      year: m.year,
      month: m.month,
      day: Math.min(day, daysInAppMonth(m.year, m.month)),
      hour,
      minute: 0,
      second: 0,
      ms: 0,
    });
  // An Italian calendar day `offset` days from the 1st of the current month, at midnight.
  const dayFromMonthStart = (offset: number) => {
    const d = new Date(Date.UTC(today.year, today.month - 1, 1 + offset));
    return fromAppWallClock({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
      ms: 0,
    });
  };

  const months: Month[] = [];
  for (let age = MONTHS - 1; age >= 0; age -= 1) {
    const m = shiftAppMonth(today.year, today.month, age);
    months.push({ ...m, age, key: `${m.year}-${String(m.month).padStart(2, '0')}` });
  }

  const records: DemoStory['records'] = [];
  let n = 0;
  const add = (type: 'REVENUE' | 'COST', m: Month, day: number, amount: number, description: string, source = 'bank') => {
    if (amount <= 0) return;
    records.push({
      organizationId: DEMO_ORG,
      type,
      amount: Math.round(amount),
      currency: 'EUR',
      description,
      source,
      occurredAt: at(m, day),
      externalId: `${markerPrefix(month)}${(n += 1)}`,
    });
  };
  const split = (type: 'REVENUE' | 'COST', m: Month, total: number, parts: [number, number][], description: string, source?: string) => {
    for (const [day, weight] of parts) add(type, m, day, total * weight, description, source);
  };

  for (const m of months) {
    const recent = m.age <= CHANGE_AGE;

    // Revenue: monthly fees, consulting projects, training. Slow growth.
    const base = 72_000 * (1 + 0.007 * (MONTHS - 1 - m.age));
    split('REVENUE', m, base * 0.4, [[2, 0.22], [2, 0.18], [3, 0.17], [3, 0.16], [4, 0.14], [5, 0.13]], 'servizi_ricorrenti/canoni');
    split('REVENUE', m, base * 0.48 * consultingSeason(m.month), [[6, 0.3], [13, 0.25], [20, 0.25], [27, 0.2]], 'consulenza/progetti');
    split('REVENUE', m, base * 0.12 * trainingSeason(m.month), [[10, 0.55], [24, 0.45]], 'formazione/corsi', 'manual');

    // Personnel: 10 people, then a senior hire in the latest quarter.
    const staff = 36_000 + (recent ? 4_800 : 0);
    add('COST', m, 16, staff * 0.3, 'personale/contributi');
    add('COST', m, 27, staff * 0.7, 'personale/stipendi');

    // Software: one movement per subscription; two new ones in the latest quarter.
    for (const s of SOFTWARE) {
      if (s.since === 'recent' && !recent) continue;
      add('COST', m, s.day, s.amount, `software/${s.vendor}`);
    }

    // Materials and marketing: a little lower in the latest quarter.
    split('COST', m, (recent ? 5_000 : 5_500) * VAR_MATERIALS[m.age], [[7, 0.4], [14, 0.35], [23, 0.25]], 'materie_prime/materiali di consumo');
    const marketing = (recent ? 4_300 : 4_800) * VAR_MARKETING[m.age];
    add('COST', m, 4, marketing * 0.6, 'marketing/campagne online');
    add('COST', m, 19, marketing * 0.4, 'marketing/eventi');

    for (const f of FIXED) add('COST', m, f.day, f.amount, `${f.category}/${f.vendor}`);

    split('COST', m, 1_700 * VAR_TRAVEL[m.age], [[9, 0.4], [17, 0.3], [26, 0.3]], 'viaggi/trasferte');
  }

  // Receivables: one customer owes almost half of the total, with an invoice
  // more than 40 days overdue; two others overdue; the rest not yet due. Due
  // dates count from the 1st of the month, so the story holds all month long.
  const RECEIVABLES: { customer: string; email: string; amount: number; due: number; paid?: number }[] = [
    { customer: 'Edilcasa Nord Srl', email: 'amministrazione@edilcasanord.example', amount: 18_000, due: -45 },
    { customer: 'Edilcasa Nord Srl', email: 'amministrazione@edilcasanord.example', amount: 9_000, due: 40 },
    { customer: 'Logistica Ponente Spa', email: 'contabilita@logisticaponente.example', amount: 6_500, due: -20 },
    { customer: 'Studio Associato Verdelli', email: 'segreteria@studioverdelli.example', amount: 3_800, due: -8 },
    { customer: 'Ferrandi Alimentari Srl', email: 'fatture@ferrandialimentari.example', amount: 7_200, due: 35 },
    { customer: 'Arredi Galletti Snc', email: 'ufficio@arredigalletti.example', amount: 5_500, due: 42 },
    { customer: 'Neroni Informatica Srl', email: 'amministrazione@neroniinformatica.example', amount: 4_000, due: 50 },
    { customer: 'Ottica Contini Sas', email: 'info@otticacontini.example', amount: 3_000, due: 58 },
    // Already paid: history.
    { customer: 'Trasporti Moretto Srl', email: 'amministrazione@trasportimoretto.example', amount: 4_200, due: -30, paid: -32 },
    { customer: 'Eventi Romanelli Srl', email: 'info@eventiromanelli.example', amount: 2_600, due: -15, paid: -10 },
    { customer: 'Ferrandi Alimentari Srl', email: 'fatture@ferrandialimentari.example', amount: 6_800, due: -60, paid: -58 },
  ];
  const receivables: DemoStory['receivables'] = RECEIVABLES.map((r, i) => {
    const issuedDate = dayFromMonthStart(r.due - 30);
    return {
      organizationId: DEMO_ORG,
      customerName: r.customer,
      customerEmail: r.email,
      amount: r.amount,
      currency: 'EUR',
      invoiceNumber: `FT-${toAppDateString(issuedDate).slice(0, 4)}-${String(101 + i).padStart(4, '0')}`,
      issuedDate,
      dueDate: dayFromMonthStart(r.due),
      status: r.paid === undefined ? 'OPEN' : 'PAID',
      paidAt: r.paid === undefined ? null : dayFromMonthStart(r.paid),
      createdAt: issuedDate,
    };
  });

  // Recurring expenses: exactly the software and fixed costs of the movements.
  const nextMonth = shiftAppMonth(today.year, today.month, -1);
  const firstMonth = months[0];
  const changeMonth = months[MONTHS - 1 - CHANGE_AGE];
  const recurringExpenses: DemoStory['recurringExpenses'] = [
    ...SOFTWARE.map((s) => ({ category: 'software', vendor: s.vendor, amount: s.amount, day: s.day, since: s.since })),
    ...FIXED.map((f) => ({ category: f.category, vendor: f.vendor, amount: f.amount, day: f.day, since: 'always' as const })),
  ].map((e) => ({
    organizationId: DEMO_ORG,
    vendorName: e.vendor,
    amount: e.amount,
    currency: 'EUR',
    frequency: 'MONTHLY' as const,
    category: e.category,
    nextRenewal: at(nextMonth, e.day, 0),
    active: true,
    createdAt: at(e.since === 'recent' ? changeMonth : firstMonth, e.day),
  }));

  // Customer statistics: growing, with one month of high churn.
  const customerStats: DemoStory['customerStats'] = [];
  let active = ACTIVE_CUSTOMERS_15_MONTHS_AGO;
  for (const m of months) {
    if (m.age < MONTHS - 1) active += NEW_CUSTOMERS[m.age] - CHURNED_CUSTOMERS[m.age];
    customerStats.push({
      organizationId: DEMO_ORG,
      period: m.key,
      activeCustomers: active,
      newCustomers: NEW_CUSTOMERS[m.age],
      churnedCustomers: CHURNED_CUSTOMERS[m.age],
    });
  }

  return { month, records, receivables, recurringExpenses, customerStats };
}

/**
 * Rewrites the demo company's data when the Italian month has changed since the
 * last rewrite. Returns true only for the call that actually rewrote.
 *
 * `organizationId` must be the demo company's id: any other value is refused
 * with an error before any query. The current month's movements are written
 * for the whole month; every page and comparison that uses a period stops at
 * today, so the days still to come stay out of them.
 */
export async function ensureDemoDataCurrent(organizationId: string, now: Date = new Date()): Promise<boolean> {
  if (organizationId !== DEMO_ORG) {
    throw new Error(`[demo:data] refused: ${organizationId} is not the demo company`);
  }
  const month = toAppDateString(now).slice(0, 7);
  if (verifiedMonth === month) return false;

  const where = { organizationId: DEMO_ORG };
  const markerWhere = { organizationId: DEMO_ORG, externalId: { startsWith: markerPrefix(month) } };
  if (await prisma.financialRecord.findFirst({ where: markerWhere, select: { id: true } })) {
    verifiedMonth = month;
    return false;
  }
  // The demo company is created by getDemoContext; without it there is nothing to fill.
  if (!(await prisma.organization.findUnique({ where: { id: DEMO_ORG }, select: { id: true } }))) return false;

  const story = buildDemoStory(now);
  const rewritten = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${LOCK_KEY}))`;
      // A visit that waited on the lock finds the month already written.
      if (await tx.financialRecord.findFirst({ where: markerWhere, select: { id: true } })) return false;

      await tx.financialRecord.deleteMany({ where });
      await tx.receivable.deleteMany({ where });
      await tx.recurringExpense.deleteMany({ where });
      await tx.customerStat.deleteMany({ where });
      // Old cashflow rows would hide the cashflow derived from the new movements.
      await tx.cashflowEntry.deleteMany({ where });

      await tx.financialRecord.createMany({ data: story.records });
      await tx.receivable.createMany({ data: story.receivables });
      await tx.recurringExpense.createMany({ data: story.recurringExpenses });
      await tx.customerStat.createMany({ data: story.customerStats });
      // What the AI reads as "azienda <industry> con <employees> dipendenti".
      await tx.organization.update({
        where: { id: DEMO_ORG },
        data: { industry: 'Servizi alle imprese', employees: 11 },
      });
      return true;
    },
    { maxWait: 30_000, timeout: 60_000 },
  );

  verifiedMonth = month;
  if (rewritten) {
    console.info(
      `[demo:data] demo company rewritten for ${month}: ${story.records.length} movements, ` +
        `${story.receivables.length} receivables, ${story.recurringExpenses.length} recurring expenses, ` +
        `${story.customerStats.length} months of customer statistics`,
    );
  }
  return rewritten;
}
