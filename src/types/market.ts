export type Competitor = {
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

export type MarketProfile = {
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

export type MarketTrendPoint = {
  id: string;
  period: string;
  marketSize: number;
  growthPct: number;
  tam: number;
  sam: number;
  som: number;
};

export type SwotKind = "STRENGTH" | "WEAKNESS" | "OPPORTUNITY" | "THREAT";

export type SwotItem = {
  id: string;
  kind: SwotKind;
  text: string;
  weight: number;
};

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
