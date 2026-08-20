import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { buildDemoDataset } from '../src/lib/demo/data';
import { assertNotProductionDatabase } from './guard';

// Questo script fa `deleteMany` su 7 tabelle e riscrive i dati della demo: se
// parte contro il database di produzione cancella dati di clienti veri. La
// guardia è chiamata qui, a livello di modulo, perché è il punto più presto
// possibile — prima del PrismaClient, prima degli upsert e prima dei deleteMany.
assertNotProductionDatabase('npm run db:seed');

const prisma = new PrismaClient();

async function main() {
  const data = buildDemoDataset();
  const demoPasswordHash = await bcrypt.hash('DemoAnlyra2026!', 12);
  const now = new Date();

  const org = await prisma.organization.upsert({
    where: { slug: data.organization.slug },
    update: { name: data.organization.name },
    create: {
      id: data.organization.id,
      name: data.organization.name,
      slug: data.organization.slug,
      plan: data.organization.plan as 'PRO',
      currency: data.organization.currency,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@pro.app' },
    update: {
      emailVerifiedAt: now,
      emailVerified: now,
      passwordHash: demoPasswordHash,
    },
    create: {
      email: 'demo@pro.app',
      name: 'Demo User',
      locale: 'it',
      emailVerifiedAt: now,
      emailVerified: now,
      passwordHash: demoPasswordHash,
    },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: { userId: user.id, organizationId: org.id, role: 'owner' },
  });

  await prisma.transaction.deleteMany({ where: { organizationId: org.id } });
  await prisma.financialRecord.deleteMany({ where: { organizationId: org.id } });
  await prisma.cashflowEntry.deleteMany({ where: { organizationId: org.id } });
  await prisma.budgetEntry.deleteMany({ where: { organizationId: org.id } });
  await prisma.customerStat.deleteMany({ where: { organizationId: org.id } });
  await prisma.subscription.deleteMany({ where: { organizationId: org.id } });
  await prisma.insight.deleteMany({ where: { organizationId: org.id } });

  await prisma.transaction.createMany({
    data: data.transactions.map((t) => ({
      organizationId: org.id,
      date: t.date,
      kind: t.kind,
      category: t.category,
      subcategory: t.subcategory,
      amount: t.amount,
      description: t.description,
      source: t.source,
    })),
  });

  await prisma.financialRecord.createMany({
    data: data.transactions.map((t) => ({
      organizationId: org.id,
      type: t.kind,
      amount: t.amount,
      currency: 'EUR',
      description: t.subcategory ? `${t.category}/${t.subcategory}` : t.category,
      occurredAt: t.date,
      source: t.source,
    })),
  });

  await prisma.cashflowEntry.createMany({
    data: data.cashflow.map((c) => ({
      organizationId: org.id,
      date: c.date,
      direction: c.direction,
      category: c.category,
      amount: c.amount,
      description: c.description,
    })),
  });

  await prisma.budgetEntry.createMany({
    data: data.budget.map((b) => ({
      organizationId: org.id,
      period: b.period,
      category: b.category,
      planned: b.planned,
      actual: b.actual,
    })),
  });

  await prisma.customerStat.createMany({
    data: data.customers.map((c) => ({ organizationId: org.id, ...c })),
  });

  await prisma.subscription.createMany({
    data: data.subscriptions.map((s) => ({ organizationId: org.id, ...s })),
  });

  await prisma.insight.createMany({
    data: data.insights.map((i) => ({ organizationId: org.id, ...i })),
  });

  // ── Demo alert story ──────────────────────────────────────────────────────
  // Uses relative dates so the triggers work regardless of when the seed runs.
  // Target: exactly 2 alerts fire — cost_over_budget (MEDIUM) + churn_high (HIGH).

  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  // a) Marketing spike: add baseline costs for months -3/-2/-1 and a +30% spike
  //    for the current month. ruleCostOverBudget groups by description.split('/')[0]
  //    so description 'marketing/ads' → category 'marketing'.
  await prisma.financialRecord.createMany({
    data: [
      // baseline months (5 000 EUR each) — within the 3-month look-back window
      { organizationId: org.id, type: 'COST', currency: 'EUR', amount: 5000, description: 'marketing/ads', occurredAt: new Date(y, m - 3, 15), source: 'manual' },
      { organizationId: org.id, type: 'COST', currency: 'EUR', amount: 5000, description: 'marketing/ads', occurredAt: new Date(y, m - 2, 15), source: 'manual' },
      { organizationId: org.id, type: 'COST', currency: 'EUR', amount: 5000, description: 'marketing/ads', occurredAt: new Date(y, m - 1, 15), source: 'manual' },
      // current-month spike: 5 000 * 1.30 * 3 dominates → clearly > avgPrev * 1.10
      { organizationId: org.id, type: 'COST', currency: 'EUR', amount: 7000, description: 'marketing/ads', occurredAt: new Date(y, m, 5), source: 'manual' },
    ],
  });

  // b) High-churn customerStat — two months needed to keep rules coherent:
  //    Previous month (240 active): provides a baseline so MoM change is only
  //    -4% (240→230), well below the -20% threshold → ruleTopCustomerDecline
  //    does NOT fire.
  //    Current month (230 active, 17 churned): churnRate = 17/247 ≈ 6.9% > 5%
  //    → ruleChurnHigh fires at severity HIGH. ✓
  const prevMonth = m === 0 ? 11 : m - 1;
  const prevYear  = m === 0 ? y - 1 : y;
  const prevPeriod    = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
  const currentPeriod = `${y}-${String(m + 1).padStart(2, '0')}`;

  await prisma.customerStat.upsert({
    where: { organizationId_period: { organizationId: org.id, period: prevPeriod } },
    update: { activeCustomers: 240, newCustomers: 12, churnedCustomers: 10 },
    create: { organizationId: org.id, period: prevPeriod, activeCustomers: 240, newCustomers: 12, churnedCustomers: 10 },
  });
  await prisma.customerStat.upsert({
    where: { organizationId_period: { organizationId: org.id, period: currentPeriod } },
    update: { activeCustomers: 230, newCustomers: 8, churnedCustomers: 17 },
    create: { organizationId: org.id, period: currentPeriod, activeCustomers: 230, newCustomers: 8, churnedCustomers: 17 },
  });

  console.log('Seed complete:', {
    transactions: data.transactions.length,
    financialRecords: data.transactions.length,
    cashflow: data.cashflow.length,
    budget: data.budget.length,
    insights: data.insights.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
