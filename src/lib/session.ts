// Stub session helper used until full auth lands.
// Returns the demo user/org for dev so SaaS features work end-to-end.
import { prisma } from './prisma';

const DEMO_EMAIL = 'demo@pro.app';
const DEMO_ORG_ID = 'demo-org';

export async function getCurrentContext() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: 'Demo User' },
  });

  // Anchor on the hardcoded id so the context always resolves to the same org
  // regardless of slug. All seeded data (Alert_b7, Insight, etc.) references 'demo-org'.
  const org = await prisma.organization.upsert({
    where: { id: DEMO_ORG_ID },
    update: {},
    create: {
      id: DEMO_ORG_ID,
      name: 'Anlyra Demo',
      slug: 'demo',
      industry: 'SaaS B2B',
      employees: 18,
    },
  });

  const existingMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
  });
  if (!existingMembership) {
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: 'owner' },
    });
  }
  // Ensure data exists even if membership existed but seeding never ran
  await seedDemoData(org.id).catch(() => {
    // ignore if another request already seeded
  });

  return { userId: user.id, organizationId: org.id };
}

// Deterministic PRNG so demo data is stable
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REVENUE_CATEGORIES: { key: string; weight: number; sub: string[] }[] = [
  { key: 'subscriptions', weight: 0.55, sub: ['starter', 'pro', 'enterprise'] },
  { key: 'services', weight: 0.22, sub: ['consulting', 'onboarding'] },
  { key: 'licenses', weight: 0.13, sub: ['annual', 'perpetual'] },
  { key: 'partnerships', weight: 0.06, sub: ['affiliate', 'reseller'] },
  { key: 'other', weight: 0.04, sub: ['training', 'merch'] },
];

const COST_CATEGORIES: { key: string; weight: number; sub: string[] }[] = [
  { key: 'payroll', weight: 0.42, sub: ['engineering', 'sales', 'operations'] },
  { key: 'cogs', weight: 0.18, sub: ['hosting', 'third_party_api'] },
  { key: 'marketing', weight: 0.14, sub: ['paid_ads', 'events', 'content'] },
  { key: 'software', weight: 0.1, sub: ['saas', 'tooling'] },
  { key: 'office', weight: 0.07, sub: ['rent', 'utilities'] },
  { key: 'travel', weight: 0.04, sub: ['flights', 'lodging'] },
  { key: 'legal', weight: 0.03, sub: ['consulting', 'compliance'] },
  { key: 'other', weight: 0.02, sub: ['bank_fees', 'misc'] },
];

function pick(rand: () => number, items: { key: string; weight: number; sub: string[] }[]) {
  let r = rand();
  for (const it of items) {
    if ((r -= it.weight) <= 0) return it;
  }
  return items[items.length - 1];
}

function jitter(rand: () => number, spread = 0.2) {
  return 1 - spread + rand() * spread * 2;
}

async function seedDemoData(organizationId: string) {
  await seedKpis(organizationId);
  await seedCompetitors(organizationId);
  // legacy seed removed v5: seedInsights() wrote to Insight_b7 which has a
  // FK constraint to Organization_b7 in SQLite — FK violated because the active
  // organizationId belongs to the modern Organization table, not Organization_b7.
  await seedAlertConfigsAndAlerts(organizationId);
  const existingRecords = await prisma.financialRecord.count({ where: { organizationId } });
  if (existingRecords > 0) return;

  const rand = mulberry32(20260504);
  const now = new Date();
  const MONTHS = 18;
  const data: {
    organizationId: string;
    type: string;
    amount: number;
    occurredAt: Date;
    description: string;
    source: string;
    currency: string;
  }[] = [];

  for (let i = MONTHS - 1; i >= 0; i -= 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ageIndex = MONTHS - 1 - i; // 0 == oldest
    const revenueTarget = 78_000 * Math.pow(1.045, ageIndex) * jitter(rand, 0.06);
    const costTarget = 58_000 * Math.pow(1.038, ageIndex) * jitter(rand, 0.07);

    // Revenue transactions
    const revCount = 22 + Math.floor(rand() * 10);
    let remaining = revenueTarget;
    for (let j = 0; j < revCount; j += 1) {
      const cat = pick(rand, REVENUE_CATEGORIES);
      const share = j === revCount - 1 ? remaining : (revenueTarget / revCount) * jitter(rand, 0.6);
      const amount = Math.max(80, Math.round(Math.min(remaining, share)));
      remaining -= amount;
      const day = 1 + Math.floor(rand() * 27);
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const sub = cat.sub[Math.floor(rand() * cat.sub.length)];
      data.push({
        organizationId,
        type: 'REVENUE',
        amount,
        occurredAt: date,
        description: `${cat.key}/${sub}`,
        source: rand() > 0.6 ? 'stripe' : rand() > 0.5 ? 'bank' : 'manual',
        currency: 'EUR',
      });
      if (remaining <= 0) break;
    }

    // Cost transactions
    const costCount = 20 + Math.floor(rand() * 10);
    remaining = costTarget;
    for (let j = 0; j < costCount; j += 1) {
      const cat = pick(rand, COST_CATEGORIES);
      const share = j === costCount - 1 ? remaining : (costTarget / costCount) * jitter(rand, 0.5);
      const amount = Math.max(60, Math.round(Math.min(remaining, share)));
      remaining -= amount;
      const day = 1 + Math.floor(rand() * 27);
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const sub = cat.sub[Math.floor(rand() * cat.sub.length)];
      data.push({
        organizationId,
        type: 'COST',
        amount,
        occurredAt: date,
        description: `${cat.key}/${sub}`,
        source: rand() > 0.7 ? 'bank' : 'manual',
        currency: 'EUR',
      });
      if (remaining <= 0) break;
    }
  }

  await prisma.financialRecord.createMany({ data });
}

async function seedKpis(organizationId: string) {
  const count = await prisma.kPI.count({ where: { organizationId } });
  if (count > 0) return;
  await prisma.kPI.createMany({
    data: [
      { organizationId, name: 'Churn rate', value: 4.2, unit: '%', target: 3 },
      { organizationId, name: 'NPS', value: 42, unit: null, target: 50 },
      { organizationId, name: 'Conversion rate', value: 2.8, unit: '%', target: 4 },
      { organizationId, name: 'CAC', value: 320, unit: 'EUR', target: 250 },
      { organizationId, name: 'LTV', value: 4800, unit: 'EUR', target: 5000 },
      { organizationId, name: 'Active customers', value: 312, unit: null, target: 400 },
    ],
  });
}

async function seedCompetitors(organizationId: string) {
  const count = await prisma.competitor_b7.count({ where: { organizationId } });
  if (count > 0) return;
  await prisma.competitor_b7.createMany({
    data: [
      { organizationId, name: 'Competitor Alpha', marketShare: 18, notes: 'Leader storico, prezzi alti' },
      { organizationId, name: 'Competitor Beta', marketShare: 12, notes: 'Crescita rapida, focus PMI' },
      { organizationId, name: 'Competitor Gamma', marketShare: 7, notes: 'Nicchia premium' },
    ],
  });
}

// DEPRECATED — not called anymore (see "legacy seed removed v5" comment above).
// Insight_b7 has FOREIGN KEY organizationId → Organization_b7 in SQLite (init migration).
// Active Organization records are not in Organization_b7 → FK constraint violation.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function seedInsights(organizationId: string) {
  const count = await prisma.insight_b7.count({ where: { organizationId } });
  if (count > 0) return;
  await prisma.insight_b7.createMany({
    data: [
      {
        organizationId,
        type: 'WARNING',
        priority: 'HIGH',
        status: 'NEW',
        title: 'CAC in crescita oltre il target',
        summary:
          'Il costo di acquisizione è salito a 320 € contro un target di 250 €. Conversion rate stabile.',
        content:
          "Negli ultimi 3 mesi il CAC è cresciuto del 28% mentre il conversion rate è fermo al 2,8%. " +
          "Il rapporto LTV/CAC è 15x ma il payback period si è allungato. " +
          "Suggerimento: rivedi mix dei canali paid (paid social pesa il 42% e ha CAC peggiore). " +
          "Sposta budget su content marketing e referral, target CAC 250 € entro 90 giorni.",
        confidence: 0.86,
      },
      {
        organizationId,
        type: 'OPPORTUNITY',
        priority: 'MEDIUM',
        status: 'NEW',
        title: 'Espansione piano Pro su clienti Starter',
        summary:
          'Il 38% dei clienti Starter usa già feature da piano Pro: opportunità di upselling.',
        content:
          "Analizzando l'uso delle feature, 118 clienti su 312 attivano funzionalità che richiederebbero il piano Pro. " +
          "Un campagna di upgrade mirata con sconto del 20% per i primi 3 mesi può aumentare l'MRR di circa 9-12k €/mese. " +
          "Suggerimento: lancia entro 30 giorni con email + in-app banner.",
        confidence: 0.74,
      },
      {
        organizationId,
        type: 'STRATEGY',
        priority: 'LOW',
        status: 'NEW',
        title: 'Espansione internazionale: DACH e Iberia',
        summary:
          "Il segmento PMI in DACH e Iberia è in crescita del 14% YoY: valutare espansione 2026.",
        content:
          "I dati di mercato indicano che il TAM in DACH cresce a doppia cifra. " +
          "TechFlow ha già 7 clienti tedeschi via inbound: opportunità di local-first GTM. " +
          "Investimento iniziale stimato 80-120k € per traduzione, GDPR compliance, " +
          "primo sales rep di lingua tedesca. Break-even atteso al mese 14.",
        confidence: 0.62,
      },
    ],
  });
}

async function seedAlertConfigsAndAlerts(organizationId: string) {
  const cfgCount = await prisma.aiAlertConfig.count({ where: { organizationId } });
  if (cfgCount === 0) {
    await prisma.aiAlertConfig.createMany({
      data: [
        { organizationId, metric: 'churn_rate', enabled: true, threshold: 5, comparator: 'gt' },
        { organizationId, metric: 'cash_runway_months', enabled: true, threshold: 6, comparator: 'lt' },
        { organizationId, metric: 'revenue_mom_pct', enabled: true, threshold: -10, comparator: 'lt' },
        { organizationId, metric: 'cost_mom_pct', enabled: true, threshold: 15, comparator: 'gt' },
        { organizationId, metric: 'nps', enabled: true, threshold: 30, comparator: 'lt' },
      ],
    });
  }

  const alertCount = await prisma.aiAlert.count({ where: { organizationId } });
  if (alertCount > 0) return;

  await prisma.aiAlert.createMany({
    data: [
      {
        organizationId,
        type: 'finance',
        severity: 'HIGH',
        metric: 'cost_mom_pct',
        title: 'Picco costi marketing',
        message:
          'I costi di marketing sono aumentati del 22% rispetto al mese precedente. Verifica le campagne attive.',
        thresholdValue: 15,
        currentValue: 22,
      },
      {
        organizationId,
        type: 'operations',
        severity: 'MEDIUM',
        metric: 'churn_rate',
        title: 'Churn vicino alla soglia',
        message:
          'Il churn rate ha raggiunto il 4,2% (soglia 5%). Tendenza stabile ma da monitorare.',
        thresholdValue: 5,
        currentValue: 4.2,
      },
      {
        organizationId,
        type: 'finance',
        severity: 'LOW',
        metric: 'revenue_mom_pct',
        title: 'Ricavi MoM in lieve flessione',
        message: 'I ricavi del mese corrente sono leggermente sotto la media.',
        thresholdValue: -10,
        currentValue: -3,
      },
    ],
  });
}
