import { prisma } from './prisma';
import { getCurrentContext } from './session';

export type MarketProfileDTO = {
  marketSharePct: number;
  scoreRevenue: number;
  scoreTeam: number;
  scoreShare: number;
  scorePricing: number;
  scoreProduct: number;
  scoreBrand: number;
  pricePosition: number;
  qualityScore: number;
};

export type MarketCompetitorDTO = {
  id: string;
  organizationId: string;
  name: string;
  website: string | null;
  revenue: number;
  employees: number;
  marketSharePct: number;
  strengths: string[];
  weaknesses: string[];
  scoreRevenue: number;
  scoreTeam: number;
  scoreShare: number;
  scorePricing: number;
  scoreProduct: number;
  scoreBrand: number;
  pricePosition: number;
  qualityScore: number;
  createdAt: string;
  updatedAt: string;
};

export type MarketSummary = {
  marketSharePct: number;
  tam: number;
  sam: number;
  som: number;
  growthPct: number;
  overview: string | null;
  competitorCount: number;
  updatedAt: string;
};

function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

async function loadOrgFinancials() {
  const { organizationId } = await getCurrentContext();
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const records = await prisma.financialRecord.findMany({ where: { organizationId } });
  const totalRevenue = records.filter((r) => r.type === 'REVENUE').reduce((s, r) => s + r.amount, 0);
  const last12 = new Date();
  last12.setMonth(last12.getMonth() - 12);
  const recentRevenue = records
    .filter((r) => r.type === 'REVENUE' && r.occurredAt >= last12)
    .reduce((s, r) => s + r.amount, 0);
  return { organizationId, org, totalRevenue, recentRevenue };
}

export async function getMarketSummary(): Promise<MarketSummary> {
  const { organizationId, org, recentRevenue } = await loadOrgFinancials();
  // Synthesize plausible market sizing for SaaS B2B:
  // SOM = 1.5x TechFlow ARR (room to grow within current segment)
  // SAM = ~10x SOM
  // TAM = ~5x SAM
  const arr = recentRevenue || 1_000_000;
  const som = Math.round(arr * 1.5);
  const sam = Math.round(som * 10);
  const tam = Math.round(sam * 5);
  const competitorCount = await prisma.competitor_b7.count({ where: { organizationId } });
  const marketSharePct = sam > 0 ? +(arr / sam * 100).toFixed(2) : 0;
  return {
    marketSharePct,
    tam,
    sam,
    som,
    growthPct: 8.4,
    overview: `${org.name} opera nel mercato ${org.industry} con ${org.employees} dipendenti.`,
    competitorCount,
    updatedAt: new Date().toISOString(),
  };
}

export async function getMarketProfileAndCompetitors(): Promise<{
  profile: MarketProfileDTO;
  competitors: MarketCompetitorDTO[];
}> {
  const { organizationId, org, recentRevenue } = await loadOrgFinancials();
  const competitorRows = await prisma.competitor_b7.findMany({
    where: { organizationId },
    orderBy: { marketShare: 'desc' },
  });

  // Use TechFlow's revenue as 100% reference; synthesize relative metrics
  const ourRevenue = recentRevenue || 1_000_000;
  const ourShare = competitorRows.reduce((s, c) => s + (c.marketShare ?? 0), 0);
  const ourMarketSharePct = Math.max(5, Math.round(100 - ourShare));

  const profile: MarketProfileDTO = {
    marketSharePct: ourMarketSharePct,
    scoreRevenue: 72,
    scoreTeam: 68,
    scoreShare: ourMarketSharePct,
    scorePricing: 70,
    scoreProduct: 78,
    scoreBrand: 60,
    pricePosition: 55,
    qualityScore: 78,
  };

  const competitors: MarketCompetitorDTO[] = competitorRows.map((c, i) => {
    // derive deterministic-but-varied scores from name length
    const seed = c.name.length;
    const revenueMul = [0.65, 1.4, 0.45][i % 3];
    return {
      id: c.id,
      organizationId,
      name: c.name,
      website: null,
      revenue: Math.round(ourRevenue * revenueMul),
      employees: 12 + ((seed * 7) % 60),
      marketSharePct: c.marketShare ?? 0,
      strengths: (c.notes ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      weaknesses: [],
      scoreRevenue: normalize(ourRevenue * revenueMul, ourRevenue * 1.5),
      scoreTeam: 50 + (seed % 40),
      scoreShare: Math.round((c.marketShare ?? 0) * 4),
      scorePricing: 50 + ((seed * 3) % 40),
      scoreProduct: 55 + ((seed * 5) % 35),
      scoreBrand: 45 + ((seed * 7) % 50),
      pricePosition: 30 + ((seed * 11) % 60),
      qualityScore: 55 + ((seed * 13) % 40),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  return { profile, competitors };
}

export async function getMarketTrends() {
  const { organizationId } = await loadOrgFinancials();
  const records = await prisma.financialRecord.findMany({
    where: { organizationId, type: 'REVENUE' },
    orderBy: { occurredAt: 'asc' },
  });
  const monthly = new Map<string, number>();
  for (const r of records) {
    const key = `${r.occurredAt.getFullYear()}-${String(r.occurredAt.getMonth() + 1).padStart(2, '0')}`;
    monthly.set(key, (monthly.get(key) ?? 0) + r.amount);
  }
  const points = Array.from(monthly.entries())
    .sort()
    .map(([period, revenue], idx, arr) => {
      const tam = Math.round(revenue * 50);
      const sam = Math.round(revenue * 10);
      const som = Math.round(revenue * 1.5);
      const prev = idx > 0 ? arr[idx - 1][1] : revenue;
      const growthPct = prev > 0 ? +(((revenue - prev) / prev) * 100).toFixed(2) : 0;
      return {
        id: `t_${period}`,
        period,
        marketSize: tam,
        growthPct,
        tam,
        sam,
        som,
      };
    });
  return points;
}
