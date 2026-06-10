import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { buildDemoDataset } from '../src/lib/demo/data';

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
