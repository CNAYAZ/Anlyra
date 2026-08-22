import { PrismaClient } from '@prisma/client';
import { assertNotProductionDatabase } from './guard';

// Cancella tutti gli insight dell'organizzazione demo e li riscrive.
assertNotProductionDatabase('npx tsx prisma/seed-insights.ts');

const prisma = new PrismaClient();

// Insight model fields: id (auto), organizationId, title, summary, impact, tone, createdAt
// type/priority/status/content/confidence are derived by the API from tone/impact.

// L'organizzazione demo, per id esplicito (stesso criterio di
// prisma/seed-receivables.ts e stesso id creato da prisma/seed.ts via
// buildDemoDataset). PRIMA questo script cercava lo slug 'techflow-srl' e, non
// trovandolo, ripiegava su `findFirst()` senza filtro: su un database con più
// organizzazioni avrebbe cancellato e riscritto gli insight della PRIMA che
// trovava — potenzialmente quella di un cliente vero. Nota: 'techflow-srl' non
// esiste più (l'org demo è 'acme'/demo-org), quindi il ripiego era di fatto il
// percorso NORMALE di questo script, non un caso limite.
const DEMO_ORG_ID = 'demo-org';

async function main() {
  const org = await prisma.organization.findUnique({ where: { id: DEMO_ORG_ID } });

  if (!org) {
    // Fermarsi, MAI ripiegare su un'altra organizzazione.
    console.error(
      `❌ Organizzazione demo "${DEMO_ORG_ID}" non trovata. Esegui prima il seed principale (npm run db:seed).`,
    );
    process.exit(1);
  }

  console.log(`📋 Seeding 6 insights for ${org.name} (${DEMO_ORG_ID})...`);

  const deleted = await prisma.insight.deleteMany({ where: { organizationId: org.id } });
  if (deleted.count > 0) console.log(`  🗑  Rimossi ${deleted.count} insight precedenti`);

  const insights = [
    {
      organizationId: org.id,
      title: 'Tasso di abbandono in aumento',
      summary: 'Il churn rate è cresciuto del 1.8% negli ultimi 3 mesi, raggiungendo il 4.5%. Azione consigliata: campagna di re-engagement entro 2 settimane e interviste con i clienti che hanno disdetto.',
      impact: 'Alto',
      tone: 'urgent',
    },
    {
      organizationId: org.id,
      title: 'Margine lordo sopra la media di settore',
      summary: 'Il margine lordo del 78% supera la media SaaS (70%) di 8 punti. Vantaggio competitivo che permette di accelerare gli investimenti in customer acquisition.',
      impact: 'Alto',
      tone: 'positive',
    },
    {
      organizationId: org.id,
      title: 'Focalizzati sul segmento Mid-Market',
      summary: 'I clienti Mid-Market mostrano LTV 3x più alto (€18.500) rispetto agli SMB (€6.200) e churn più basso (1.8% vs 5.2%). Suggerita ridistribuzione del budget marketing.',
      impact: 'Alto',
      tone: 'analytical',
    },
    {
      organizationId: org.id,
      title: 'Aumenta il prezzo del piano Pro',
      summary: 'Il piano Pro a €79/mese è sotto-prezzato del 25% rispetto ai competitor (DataViz Pro €99, InsightHub €110). Test di aumento a €99/mese stimato senza impatto sul tasso di acquisizione.',
      impact: 'Medio',
      tone: 'analytical',
    },
    {
      organizationId: org.id,
      title: 'Burn rate in crescita',
      summary: 'I costi mensili sono cresciuti del 22% negli ultimi 4 mesi (€38.500 → €47.000), principalmente per nuove assunzioni Engineering. Runway attuale: 11 mesi.',
      impact: 'Alto',
      tone: 'urgent',
    },
    {
      organizationId: org.id,
      title: 'Espansione mercato europeo (DACH)',
      summary: 'Il mercato SaaS B2B in DACH cresce del 18% annuo (TAM €4.2 mld). TechFlow ha già 7 clienti tedeschi via inbound. Step iniziale: campagne LinkedIn mirate + 1 SDR madrelingua.',
      impact: 'Medio',
      tone: 'positive',
    },
  ];

  for (const insight of insights) {
    await prisma.insight.create({ data: insight });
    console.log(`  ✓ ${insight.title}`);
  }

  console.log(`\n✅ Creati ${insights.length} insight per ${org.name}`);
}

main()
  .catch((e) => {
    console.error('❌ Errore:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
