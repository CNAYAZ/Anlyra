import { ok, fail } from '@/lib/api';
import { getMarketProfileAndCompetitors } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

const SWOT = [
  { id: 'sw1', kind: 'STRENGTH', text: 'Prodotto modulare e API solide', weight: 0.9 },
  { id: 'sw2', kind: 'STRENGTH', text: 'Customer support con NPS 42', weight: 0.7 },
  { id: 'sw3', kind: 'WEAKNESS', text: 'Brand awareness inferiore ai leader', weight: 0.8 },
  { id: 'sw4', kind: 'WEAKNESS', text: 'CAC superiore al target', weight: 0.7 },
  { id: 'sw5', kind: 'OPPORTUNITY', text: 'Crescita del segmento PMI italiane', weight: 0.85 },
  { id: 'sw6', kind: 'OPPORTUNITY', text: 'Espansione DACH e Iberia', weight: 0.6 },
  { id: 'sw7', kind: 'THREAT', text: 'Competitor Beta cresce rapidamente', weight: 0.75 },
  { id: 'sw8', kind: 'THREAT', text: 'Possibile pressione sui prezzi', weight: 0.55 },
];

export async function GET() {
  try {
    const { profile, competitors } = await getMarketProfileAndCompetitors();
    return ok({ profile, competitors, swot: SWOT });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
