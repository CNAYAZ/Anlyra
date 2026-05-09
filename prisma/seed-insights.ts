import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Trova l'organizzazione TechFlow (la prima organizzazione disponibile)
  const org = await prisma.organization.findFirst();
  
  if (!org) {
    console.log('❌ Nessuna organizzazione trovata. Esegui prima il seed principale.');
    return;
  }
  
  console.log(`📋 Aggiungo insight a: ${org.name}`);
  
  // Cancella gli insight esistenti per questa org (per non duplicare)
  await prisma.insight.deleteMany({ where: { organizationId: org.id } });
  
  // Crea 6 insight realistici
  const insights = [
    {
      organizationId: org.id,
      type: 'WARNING',
      priority: 'HIGH',
      status: 'NEW',
      title: 'Tasso di abbandono in aumento',
      summary: 'Il churn rate è cresciuto del 1.8% negli ultimi 3 mesi, raggiungendo il 4.5%.',
      content: 'Negli ultimi 3 mesi il churn è passato dal 2.7% al 4.5%, un aumento significativo che potrebbe ridurre il MRR del 15% nei prossimi 6 mesi se non interviene. Le cause più probabili includono: 1) onboarding poco efficace per i nuovi clienti, 2) mancanza di engagement nelle prime settimane, 3) pricing non allineato al valore percepito. Azione consigliata: lanciare una campagna di re-engagement entro 2 settimane e programmare interviste con i clienti che hanno disdetto per capire le motivazioni.',
      confidence: 0.85,
      impact: 'Alto',
      tone: 'urgent',
    },
    {
      organizationId: org.id,
      type: 'OPPORTUNITY',
      priority: 'HIGH',
      status: 'NEW',
      title: 'Margine lordo sopra la media di settore',
      summary: 'Il tuo margine lordo del 78% supera la media SaaS (70%) di 8 punti.',
      content: 'TechFlow ha un margine lordo del 78%, significativamente superiore alla media del settore SaaS che si attesta tra 65% e 72%. Questo è un vantaggio competitivo importante che ti permette di: 1) investire di più in marketing senza erodere la profittabilità, 2) offrire piani enterprise più aggressivi, 3) avere maggiore liquidità per nuove assunzioni. Suggerimento: considera di accelerare gli investimenti in customer acquisition per scalare più rapidamente sfruttando questa efficienza operativa.',
      confidence: 0.92,
      impact: 'Alto',
      tone: 'positive',
    },
    {
      organizationId: org.id,
      type: 'STRATEGY',
      priority: 'MEDIUM',
      status: 'NEW',
      title: 'Focalizzati sul segmento Mid-Market',
      summary: 'I tuoi clienti Mid-Market mostrano LTV 3x più alto di quelli SMB.',
      content: 'I dati mostrano che i clienti Mid-Market (50-200 dipendenti) hanno un Lifetime Value medio di €18,500 vs €6,200 dei clienti SMB. Inoltre il churn nel segmento Mid-Market è del 1.8% contro il 5.2% degli SMB. Strategia suggerita: dedica il 60% del budget marketing a campagne specifiche per il Mid-Market (LinkedIn ads, account-based marketing, eventi B2B verticali). Rivedi anche il tuo go-to-market per posizionarti chiaramente come soluzione enterprise-ready.',
      confidence: 0.78,
      impact: 'Alto',
      tone: 'analytical',
    },
    {
      organizationId: org.id,
      type: 'ACTION',
      priority: 'MEDIUM',
      status: 'NEW',
      title: 'Aumenta il prezzo del piano Pro',
      summary: 'Il tuo piano Pro è sotto-prezzato del 25% rispetto ai competitor.',
      content: 'Analisi competitor: il tuo piano Pro a €79/mese è significativamente più economico dei competitor diretti (DataViz Pro €99, InsightHub €110, AnalyticsMaster €95). Il valore offerto è equivalente o superiore in molte feature. Azione consigliata: testa un aumento di prezzo a €99/mese sui nuovi clienti per 30 giorni. Mantieni il prezzo per i clienti esistenti (grandfather pricing) per evitare churn. Impatto stimato: +25% di revenue per nuovo cliente senza impatto sul tasso di acquisizione.',
      confidence: 0.81,
      impact: 'Medio',
      tone: 'actionable',
    },
    {
      organizationId: org.id,
      type: 'WARNING',
      priority: 'MEDIUM',
      status: 'NEW',
      title: 'Burn rate in crescita',
      summary: 'I costi mensili sono cresciuti del 22% negli ultimi 4 mesi.',
      content: 'Il burn rate è passato da €38,500 a €47,000 al mese (+22%) negli ultimi 4 mesi, principalmente per nuove assunzioni nel team Engineering. Ad oggi il runway è di 11 mesi con il cash attuale. Se il trend continua e i ricavi non crescono di pari passo, il runway scenderà a 8 mesi entro fine anno. Suggerimento: 1) congela nuove assunzioni non critiche per 60 giorni, 2) accelera la conversione del pipeline commerciale, 3) considera di anticipare il prossimo round di funding se la traiettoria di crescita lo giustifica.',
      confidence: 0.88,
      impact: 'Alto',
      tone: 'cautious',
    },
    {
      organizationId: org.id,
      type: 'OPPORTUNITY',
      priority: 'LOW',
      status: 'NEW',
      title: 'Espansione mercato europeo',
      summary: 'Il mercato SaaS B2B in DACH cresce del 18% annuo, opportunità inespressa.',
      content: 'I paesi DACH (Germania, Austria, Svizzera) rappresentano un mercato SaaS B2B da €4.2 miliardi con crescita annua del 18%. Attualmente TechFlow non ha presenza in questi mercati. Considerazioni: 1) il prodotto è già localizzabile in tedesco, 2) la concorrenza locale è frammentata, 3) il pricing power è più alto del 15-20% rispetto al mercato italiano. Step iniziali: testa l\'interesse con campagne LinkedIn mirate, partecipa a 1-2 eventi di settore (es. SaaStr Europa), considera l\'assunzione di un Sales Development Representative madrelingua tedesca.',
      confidence: 0.65,
      impact: 'Medio',
      tone: 'visionary',
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
