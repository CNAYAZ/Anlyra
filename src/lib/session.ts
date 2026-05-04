// Stub session helper used until full auth lands.
// Returns the demo user/org for dev so SaaS features work end-to-end.
import { prisma } from './prisma';

const DEMO_EMAIL = 'demo@pro.app';
const DEMO_SLUG = 'demo-org';

export async function getCurrentContext() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: 'Demo User' },
  });

  const org = await prisma.organization.upsert({
    where: { slug: DEMO_SLUG },
    update: {},
    create: {
      name: 'Demo Org',
      slug: DEMO_SLUG,
      industry: 'Software',
      employees: 5,
    },
  });

  const existingMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
  });
  if (!existingMembership) {
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: 'owner' },
    });
    await seedDemoData(org.id).catch(() => {
      // ignore if another request already seeded
    });
  }

  return { userId: user.id, organizationId: org.id };
}

async function seedDemoData(organizationId: string) {
  const existingRecords = await prisma.financialRecord.count({ where: { organizationId } });
  if (existingRecords > 0) return;

  const now = new Date();
  const months = [0, 1, 2].map((i) => new Date(now.getFullYear(), now.getMonth() - i, 15));

  const records: { type: string; amount: number; occurredAt: Date; description: string }[] = [];
  for (const m of months) {
    records.push(
      { type: 'REVENUE', amount: 50000 + Math.random() * 5000, occurredAt: m, description: 'Ricavi mensili' },
      { type: 'COST', amount: 32000 + Math.random() * 3000, occurredAt: m, description: 'Costi operativi' },
    );
  }
  await prisma.financialRecord.createMany({
    data: records.map((r) => ({ ...r, organizationId })),
  });

  await prisma.kPI.createMany({
    data: [
      { organizationId, name: 'Churn rate', value: 4.2, unit: '%', target: 3 },
      { organizationId, name: 'NPS', value: 42, unit: null, target: 50 },
      { organizationId, name: 'Conversion rate', value: 2.8, unit: '%', target: 4 },
    ],
  });

  await prisma.competitor_b7.createMany({
    data: [
      { organizationId, name: 'Competitor Alpha', marketShare: 18, notes: 'Leader storico' },
      { organizationId, name: 'Competitor Beta', marketShare: 12, notes: 'Crescita rapida' },
      { organizationId, name: 'Competitor Gamma', marketShare: 7, notes: 'Nicchia premium' },
    ],
  });
}
