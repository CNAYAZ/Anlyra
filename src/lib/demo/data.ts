import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';

export type DemoTransaction = {
  id: string;
  date: Date;
  kind: 'REVENUE' | 'COST';
  category: string;
  subcategory?: string;
  amount: number;
  description: string;
  source: 'manual' | 'stripe' | 'import' | 'bank';
};

export type DemoCashflow = {
  id: string;
  date: Date;
  direction: 'INFLOW' | 'OUTFLOW';
  category: string;
  amount: number;
  description: string;
};

export type DemoBudget = {
  id: string;
  period: string;
  category: string;
  planned: number;
  actual: number;
};

export type DemoCustomerStat = {
  period: string;
  activeCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
};

export type DemoSubscription = {
  customer: string;
  plan: string;
  mrr: number;
  startedAt: Date;
  cancelledAt: Date | null;
};

export type DemoInsight = {
  id: string;
  title: string;
  summary: string;
  impact: string;
  tone: 'positive' | 'negative' | 'neutral';
};

export type DemoDataset = {
  organization: { id: string; name: string; slug: string; plan: string; currency: string };
  transactions: DemoTransaction[];
  cashflow: DemoCashflow[];
  budget: DemoBudget[];
  customers: DemoCustomerStat[];
  subscriptions: DemoSubscription[];
  insights: DemoInsight[];
};

const REVENUE_CATEGORIES = [
  { key: 'subscriptions', weight: 0.55, sub: ['starter', 'pro', 'enterprise'] },
  { key: 'services', weight: 0.22, sub: ['consulting', 'onboarding'] },
  { key: 'licenses', weight: 0.13, sub: ['annual', 'perpetual'] },
  { key: 'partnerships', weight: 0.06, sub: ['affiliate', 'reseller'] },
  { key: 'other', weight: 0.04, sub: ['training', 'merch'] },
];

const COST_CATEGORIES = [
  { key: 'payroll', weight: 0.42, sub: ['engineering', 'sales', 'operations'] },
  { key: 'cogs', weight: 0.18, sub: ['hosting', 'third_party_api'] },
  { key: 'marketing', weight: 0.14, sub: ['paid_ads', 'events', 'content'] },
  { key: 'software', weight: 0.1, sub: ['saas', 'tooling'] },
  { key: 'office', weight: 0.07, sub: ['rent', 'utilities'] },
  { key: 'travel', weight: 0.04, sub: ['flights', 'lodging'] },
  { key: 'legal', weight: 0.03, sub: ['consulting', 'compliance'] },
  { key: 'other', weight: 0.02, sub: ['bank_fees', 'misc'] },
];

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

function jitter(rand: () => number, spread = 0.2) {
  return 1 - spread + rand() * spread * 2;
}

function monthlyRevenueTarget(i: number) {
  const base = 82_000;
  const growth = Math.pow(1.048, i);
  const seasonal = 1 + 0.12 * Math.sin((i / 12) * Math.PI * 2 - Math.PI / 2);
  return base * growth * seasonal;
}

function monthlyCostTarget(i: number) {
  const base = 58_000;
  const growth = Math.pow(1.031, i);
  return base * growth;
}

function pickCategory(rand: () => number, list: typeof REVENUE_CATEGORIES) {
  const r = rand();
  let acc = 0;
  for (const c of list) {
    acc += c.weight;
    if (r <= acc) return c;
  }
  return list[list.length - 1];
}

export function buildDemoDataset(): DemoDataset {
  const rand = mulberry32(20260101);
  const now = new Date();
  const start = startOfMonth(subMonths(now, 11));

  const transactions: DemoTransaction[] = [];
  const cashflow: DemoCashflow[] = [];
  const budget: DemoBudget[] = [];
  const customers: DemoCustomerStat[] = [];
  const subscriptions: DemoSubscription[] = [];

  let runningCustomers = 212;
  let runningMrr = 0;

  for (let i = 0; i < 12; i += 1) {
    const monthStart = addMonths(start, i);
    const monthEnd = endOfMonth(monthStart);
    const period = format(monthStart, 'yyyy-MM');

    const revenueTarget = monthlyRevenueTarget(i) * jitter(rand, 0.05);
    const costTarget = monthlyCostTarget(i) * jitter(rand, 0.06);

    // Revenue: 25-35 transactions per month
    const revenueTxCount = 25 + Math.floor(rand() * 11);
    let remainingRev = revenueTarget;
    for (let j = 0; j < revenueTxCount; j += 1) {
      const cat = pickCategory(rand, REVENUE_CATEGORIES);
      const share = j === revenueTxCount - 1 ? remainingRev : (revenueTarget / revenueTxCount) * jitter(rand, 0.6);
      const amount = Math.max(80, Math.round(Math.min(remainingRev, share)));
      remainingRev -= amount;
      const day = 1 + Math.floor(rand() * 28);
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const sub = cat.sub[Math.floor(rand() * cat.sub.length)];
      transactions.push({
        id: `rev_${period}_${j}`,
        date,
        kind: 'REVENUE',
        category: cat.key,
        subcategory: sub,
        amount,
        description: `${cat.key} / ${sub}`,
        source: rand() > 0.6 ? 'stripe' : rand() > 0.5 ? 'bank' : 'manual',
      });
      if (remainingRev <= 0) break;
    }

    // Costs: 22-32 transactions per month
    const costTxCount = 22 + Math.floor(rand() * 11);
    let remainingCost = costTarget;
    for (let j = 0; j < costTxCount; j += 1) {
      const cat = pickCategory(rand, COST_CATEGORIES);
      const share = j === costTxCount - 1 ? remainingCost : (costTarget / costTxCount) * jitter(rand, 0.5);
      const amount = Math.max(60, Math.round(Math.min(remainingCost, share)));
      remainingCost -= amount;
      const day = 1 + Math.floor(rand() * 28);
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const sub = cat.sub[Math.floor(rand() * cat.sub.length)];
      transactions.push({
        id: `cost_${period}_${j}`,
        date,
        kind: 'COST',
        category: cat.key,
        subcategory: sub,
        amount,
        description: `${cat.key} / ${sub}`,
        source: rand() > 0.5 ? 'bank' : 'manual',
      });
      if (remainingCost <= 0) break;
    }

    // Cashflow: aggregate monthly moves
    cashflow.push({
      id: `cf_in_${period}`,
      date: monthEnd,
      direction: 'INFLOW',
      category: 'operating',
      amount: Math.round(revenueTarget * 0.92),
      description: 'Operating inflow',
    });
    if (i % 4 === 2) {
      cashflow.push({
        id: `cf_in_fin_${period}`,
        date: monthEnd,
        direction: 'INFLOW',
        category: 'financing',
        amount: 40_000 + Math.round(rand() * 20_000),
        description: 'Credit line draw',
      });
    }
    cashflow.push({
      id: `cf_out_${period}`,
      date: monthEnd,
      direction: 'OUTFLOW',
      category: 'operating',
      amount: Math.round(costTarget * 0.94),
      description: 'Operating outflow',
    });
    cashflow.push({
      id: `cf_out_inv_${period}`,
      date: monthEnd,
      direction: 'OUTFLOW',
      category: 'investing',
      amount: 8_000 + Math.round(rand() * 6_000),
      description: 'Capex / tooling',
    });

    // Budget per month per top categories
    const planRevenue = Math.round(revenueTarget * (0.95 + rand() * 0.12));
    budget.push({ id: `b_rev_${period}`, period, category: 'revenue', planned: planRevenue, actual: Math.round(revenueTarget) });
    for (const c of COST_CATEGORIES.slice(0, 5)) {
      const planned = Math.round(costTarget * c.weight * (0.9 + rand() * 0.2));
      const actual = Math.round(costTarget * c.weight * jitter(rand, 0.15));
      budget.push({ id: `b_${c.key}_${period}`, period, category: c.key, planned, actual });
    }

    // Customers
    const newC = 18 + Math.floor(rand() * 14);
    const churnedC = 6 + Math.floor(rand() * 7);
    runningCustomers += newC - churnedC;
    customers.push({ period, activeCustomers: runningCustomers, newCustomers: newC, churnedCustomers: churnedC });

    // Subscriptions: simulate accumulating MRR
    const plans = [
      { plan: 'starter', mrr: 29 },
      { plan: 'pro', mrr: 79 },
      { plan: 'enterprise', mrr: 199 },
    ];
    for (let j = 0; j < newC; j += 1) {
      const p = plans[Math.floor(rand() * plans.length)];
      const started = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 + Math.floor(rand() * 28));
      const cancelled = rand() < 0.08 ? addMonths(started, 1 + Math.floor(rand() * 4)) : null;
      subscriptions.push({ customer: `cust_${period}_${j}`, plan: p.plan, mrr: p.mrr, startedAt: started, cancelledAt: cancelled });
      runningMrr += p.mrr;
    }
  }

  const insights: DemoInsight[] = [
    {
      id: 'ins_1',
      title: 'Subscription revenue accelerating',
      summary: 'Recurring revenue grew 18.4% MoM, driven by Pro plan conversions from Starter.',
      impact: '+12.3k EUR net monthly recurring revenue vs. forecast.',
      tone: 'positive',
    },
    {
      id: 'ins_2',
      title: 'Paid marketing efficiency dropped',
      summary: 'CAC rose 23% over the last quarter while conversion from paid ads stayed flat.',
      impact: 'Reallocating 15% of paid ads to content could save ~4.8k EUR/month.',
      tone: 'negative',
    },
    {
      id: 'ins_3',
      title: 'Cash runway extended',
      summary: 'Operating cash flow improved after renegotiating hosting and reducing idle seats.',
      impact: 'Runway now 18.2 months, up from 14.1 months three months ago.',
      tone: 'positive',
    },
  ];

  return {
    organization: { id: 'demo-org', name: 'Acme Analytics', slug: 'acme', plan: 'PRO', currency: 'EUR' },
    transactions: transactions.sort((a, b) => b.date.getTime() - a.date.getTime()),
    cashflow,
    budget,
    customers,
    subscriptions,
    insights,
  };
}

let cached: DemoDataset | null = null;
export function getDemoDataset(): DemoDataset {
  if (!cached) cached = buildDemoDataset();
  return cached;
}
