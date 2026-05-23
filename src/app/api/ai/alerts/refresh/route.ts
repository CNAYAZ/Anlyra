import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

type RuleResult = {
  source: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  recommendation: string;
} | null;

// ── helpers ──────────────────────────────────────────────────────────────────

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

// ── rules ────────────────────────────────────────────────────────────────────

async function ruleCashflowNegative(orgId: string): Promise<RuleResult> {
  const now = new Date();
  const horizon = addMonths(now, 1);
  const records = await prisma.financialRecord.findMany({
    where: { organizationId: orgId },
    orderBy: { occurredAt: 'asc' },
  });
  if (records.length < 2) return null;

  const monthly = new Map<string, { rev: number; cost: number }>();
  for (const r of records) {
    const k = monthKey(r.occurredAt);
    const cur = monthly.get(k) ?? { rev: 0, cost: 0 };
    if (r.type === 'REVENUE') cur.rev += r.amount;
    else cur.cost += r.amount;
    monthly.set(k, cur);
  }
  const sorted = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (sorted.length < 2) return null;

  const lastThree = sorted.slice(-3);
  const avgBurn = lastThree.reduce((s, [, v]) => s + Math.max(0, v.cost - v.rev), 0) / lastThree.length;
  const totalRev = records.filter((r) => r.type === 'REVENUE').reduce((s, r) => s + r.amount, 0);
  const totalCost = records.filter((r) => r.type !== 'REVENUE').reduce((s, r) => s + r.amount, 0);
  const cashBuffer = Math.max(0, totalRev - totalCost);
  const runwayMonths = avgBurn > 0 ? cashBuffer / avgBurn : 99;

  if (runwayMonths >= 1) return null;

  return {
    source: 'rule:cashflow_negative',
    severity: runwayMonths < 0.5 ? 'CRITICAL' : 'HIGH',
    title: 'Cash flow negativo previsto',
    description: `Con il ritmo attuale di spesa, il saldo di cassa potrebbe diventare negativo entro ${Math.round(runwayMonths * 30)} giorni. Burn rate medio: €${avgBurn.toFixed(0)}/mese.`,
    recommendation: 'Rivedi le spese ricorrenti, accelera l\'incasso dei crediti e valuta linee di credito d\'emergenza.',
  };
}

async function ruleCostOverBudget(orgId: string): Promise<RuleResult> {
  const now = new Date();
  const thisMonth = monthKey(now);
  const threeMonthsAgo = addMonths(now, -3);

  const costs = await prisma.cost.findMany({
    where: { organizationId: orgId, date: { gte: threeMonthsAgo } },
    orderBy: { date: 'asc' },
  });
  if (costs.length === 0) return null;

  // group by category × month
  const catMonth = new Map<string, Map<string, number>>();
  for (const c of costs) {
    const mo = monthKey(c.date);
    if (!catMonth.has(c.category)) catMonth.set(c.category, new Map());
    const m = catMonth.get(c.category)!;
    m.set(mo, (m.get(mo) ?? 0) + c.amount);
  }

  const alerts: string[] = [];
  for (const [cat, months] of catMonth.entries()) {
    const entries = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const current = entries.find(([k]) => k === thisMonth)?.[1];
    if (!current) continue;
    const prev = entries.filter(([k]) => k !== thisMonth);
    if (prev.length === 0) continue;
    const avgPrev = prev.reduce((s, [, v]) => s + v, 0) / prev.length;
    if (avgPrev > 0 && current > avgPrev * 1.1) {
      alerts.push(`${cat}: €${current.toFixed(0)} (+${Math.round((current / avgPrev - 1) * 100)}% vs media)`);
    }
  }
  if (alerts.length === 0) return null;

  return {
    source: 'rule:cost_over_budget',
    severity: 'MEDIUM',
    title: 'Categoria di costo sopra la media storica',
    description: `Le seguenti categorie superano del 10%+ la media degli ultimi 3 mesi: ${alerts.join('; ')}.`,
    recommendation: 'Rivedi i contratti con i fornitori coinvolti e verifica se ci sono spese straordinarie giustificabili.',
  };
}

async function ruleTopCustomerDecline(orgId: string): Promise<RuleResult> {
  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(addMonths(now, -1));

  const stats = await prisma.customerStat.findMany({
    where: { organizationId: orgId, period: { in: [thisMonth, lastMonth] } },
  });
  if (stats.length < 2) return null;

  const cur = stats.find((s) => s.period === thisMonth);
  const prev = stats.find((s) => s.period === lastMonth);
  if (!cur || !prev || prev.activeCustomers === 0) return null;

  const change = (cur.activeCustomers - prev.activeCustomers) / prev.activeCustomers;
  if (change > -0.2) return null;

  return {
    source: 'rule:customer_decline',
    severity: change < -0.3 ? 'CRITICAL' : 'HIGH',
    title: 'Calo significativo dei clienti attivi',
    description: `I clienti attivi sono diminuiti del ${Math.abs(Math.round(change * 100))}% rispetto al mese scorso (da ${prev.activeCustomers} a ${cur.activeCustomers}).`,
    recommendation: 'Avvia immediatamente campagne di retention, identifica le cause di abbandono con survey e rivedi l\'offerta di valore.',
  };
}

async function ruleGrossMarginLow(orgId: string): Promise<RuleResult> {
  const now = new Date();
  const threeMonthsAgo = addMonths(now, -3);

  const records = await prisma.financialRecord.findMany({
    where: { organizationId: orgId, occurredAt: { gte: threeMonthsAgo } },
  });
  if (records.length === 0) return null;

  const rev = records.filter((r) => r.type === 'REVENUE').reduce((s, r) => s + r.amount, 0);
  const cost = records.filter((r) => r.type !== 'REVENUE').reduce((s, r) => s + r.amount, 0);
  if (rev === 0) return null;

  const margin = (rev - cost) / rev;
  if (margin >= 0.15) return null;

  return {
    source: 'rule:gross_margin_low',
    severity: margin < 0 ? 'CRITICAL' : margin < 0.05 ? 'HIGH' : 'MEDIUM',
    title: 'Margine lordo sotto il 15%',
    description: `Il margine lordo degli ultimi 3 mesi è ${Math.round(margin * 100)}% (ricavi €${rev.toFixed(0)}, costi €${cost.toFixed(0)}). Soglia critica: 15%.`,
    recommendation: 'Analizza le voci di costo maggiori, valuta aumenti di prezzo selettivi e individua i servizi/prodotti a basso margine.',
  };
}

async function ruleRevenueStagnant(orgId: string): Promise<RuleResult> {
  const now = new Date();
  const fourMonthsAgo = addMonths(now, -4);

  const records = await prisma.financialRecord.findMany({
    where: { organizationId: orgId, type: 'REVENUE', occurredAt: { gte: fourMonthsAgo } },
    orderBy: { occurredAt: 'asc' },
  });
  if (records.length === 0) return null;

  const monthly = new Map<string, number>();
  for (const r of records) {
    const k = monthKey(r.occurredAt);
    monthly.set(k, (monthly.get(k) ?? 0) + r.amount);
  }
  const sorted = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (sorted.length < 4) return null;

  // Last 3 months: check if growth < 2% each month
  const last3 = sorted.slice(-3);
  const isStagnant = last3.every(([, v], i) => {
    if (i === 0) return true;
    const prev = last3[i - 1][1];
    return prev > 0 && (v - prev) / prev < 0.02;
  });
  if (!isStagnant) return null;

  return {
    source: 'rule:revenue_stagnant',
    severity: 'MEDIUM',
    title: 'Crescita ricavi stagnante da 3+ mesi',
    description: `I ricavi mensili non crescono oltre il 2% da 3 mesi consecutivi (${last3.map(([k, v]) => `${k}: €${v.toFixed(0)}`).join(' → ')}).`,
    recommendation: 'Valuta nuovi canali di acquisizione clienti, offerte upsell sulla base clienti esistente e campagne promozionali mirate.',
  };
}

async function ruleChurnHigh(orgId: string): Promise<RuleResult> {
  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(addMonths(now, -1));

  const stats = await prisma.customerStat.findMany({
    where: { organizationId: orgId, period: { in: [thisMonth, lastMonth] } },
  });

  const latestStat = stats.find((s) => s.period === thisMonth) ?? stats.find((s) => s.period === lastMonth);
  if (!latestStat || latestStat.activeCustomers === 0) return null;

  const churnRate = latestStat.churnedCustomers / (latestStat.activeCustomers + latestStat.churnedCustomers);
  if (churnRate <= 0.05) return null;

  return {
    source: 'rule:churn_high',
    severity: churnRate > 0.1 ? 'CRITICAL' : 'HIGH',
    title: 'Churn rate superiore al 5%',
    description: `Il tasso di abbandono è ${(churnRate * 100).toFixed(1)}% (${latestStat.churnedCustomers} clienti persi su ${latestStat.activeCustomers + latestStat.churnedCustomers} totali).`,
    recommendation: 'Implementa un programma di customer success proattivo, intervista i clienti churned e migliora l\'onboarding per i nuovi.',
  };
}

// ── handler ───────────────────────────────────────────────────────────────────

export async function POST() {
  try {
    const { organizationId } = await getCurrentContext();

    const ruleResults = await Promise.all([
      ruleCashflowNegative(organizationId),
      ruleCostOverBudget(organizationId),
      ruleTopCustomerDecline(organizationId),
      ruleGrossMarginLow(organizationId),
      ruleRevenueStagnant(organizationId),
      ruleChurnHigh(organizationId),
    ]);

    const triggered = ruleResults.filter((r): r is NonNullable<typeof r> => r !== null);

    const upserted: string[] = [];
    for (const rule of triggered) {
      await prisma.alert.upsert({
        where: { organizationId_source: { organizationId, source: rule.source } },
        create: {
          organizationId,
          severity: rule.severity,
          status: 'NEW',
          title: rule.title,
          description: rule.description,
          source: rule.source,
          recommendation: rule.recommendation,
        },
        update: {
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          recommendation: rule.recommendation,
          // Only reset to NEW if it was previously resolved/dismissed
          status: { set: 'NEW' },
        },
      });
      upserted.push(rule.source);
    }

    return ok({ triggered: upserted.length, sources: upserted });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
