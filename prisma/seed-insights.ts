import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Active Insight model fields: id (auto), organizationId, title, summary, impact, tone, createdAt
// Fields NOT in model (derived by API): type, priority, status, content, confidence
// tone values mapped by API: urgent→WARNING, positive→OPPORTUNITY, analytical→STRATEGY, action→ACTION, *→INSIGHT
// impact values mapped by API: contains 'alt'|'hig'|'critic'→HIGH, contains 'med'→MEDIUM, else→LOW

async function main() {
  const org = await prisma.organization.findFirst({ where: { slug: 'techflow-srl' } })
    ?? await prisma.organization.findFirst();

  if (!org) {
    console.log('❌ Nessuna organizzazione trovata. Esegui prima il seed principale.');
    process.exit(1);
  }

  console.log(`📋 Seeding 6 insights for ${org.name}...`);

  // Idempotent: remove existing insights for this org before re-seeding
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
