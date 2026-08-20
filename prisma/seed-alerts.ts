import { PrismaClient } from '@prisma/client';
import { assertNotProductionDatabase } from './guard';

// Cancella tutti gli alert dell'organizzazione e li riscrive. Peggio: prende
// l'organizzazione con `findFirst()`, quindi in produzione colpirebbe la prima
// organizzazione che trova — che può essere quella di un cliente vero.
assertNotProductionDatabase('npx tsx prisma/seed-alerts.ts');

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();

  if (!org) {
    console.log('❌ Nessuna organizzazione trovata. Esegui prima il seed principale.');
    return;
  }

  console.log(`📋 Aggiungo alert a: ${org.name}`);

  // Remove existing demo alerts to avoid duplicates
  await prisma.alert.deleteMany({ where: { organizationId: org.id } });

  const alerts = [
    {
      organizationId: org.id,
      severity: 'CRITICAL',
      status: 'NEW',
      title: 'Cash flow negativo previsto entro 12 giorni',
      description: 'Con il burn rate attuale di €18.400/mese e un saldo stimato di €7.200, il conto corrente entrerà in territorio negativo entro circa 12 giorni se le entrate non accelerano.',
      source: 'rule:cashflow_negative',
      recommendation: 'Accelera l\'incasso delle fatture in sospeso (totale €34.000), negozia un pagamento dilazionato con i fornitori principali e valuta una linea di credito revolving come misura di emergenza.',
    },
    {
      organizationId: org.id,
      severity: 'HIGH',
      status: 'NEW',
      title: 'Churn rate al 7.3%: soglia critica superata',
      description: 'Il tasso di abbandono di questo mese è 7.3%, ben oltre la soglia di guardia del 5%. Nei soli ultimi 30 giorni si sono persi 22 clienti (da 301 a 279 attivi).',
      source: 'rule:churn_high',
      recommendation: 'Avvia immediatamente un programma di outreach verso i clienti a rischio (identificati da basso engagement negli ultimi 14 giorni). Programma 10 interviste con clienti churned per capire le motivazioni principali.',
    },
    {
      organizationId: org.id,
      severity: 'HIGH',
      status: 'READ',
      title: 'Margine lordo sceso al 9%: sotto la soglia del 15%',
      description: 'Gli ultimi 3 mesi mostrano ricavi totali di €142.000 e costi operativi di €129.200, con un margine lordo del 9.1%. La tendenza è in peggioramento rispetto al 13.4% del trimestre precedente.',
      source: 'rule:gross_margin_low',
      recommendation: 'Analizza le tre categorie di costo cresciute più rapidamente (hosting +34%, personale esterno +22%, software +18%). Valuta un aumento selettivo dei prezzi del 5-8% sui piani premium senza impatto sulla retention.',
    },
    {
      organizationId: org.id,
      severity: 'MEDIUM',
      status: 'NEW',
      title: 'Categoria "Marketing" sopra la media del 41%',
      description: 'La spesa marketing di questo mese è €8.900, il 41% in più rispetto alla media degli ultimi 3 mesi (€6.300/mese). Nessun picco analogo nelle conversioni o nei nuovi clienti.',
      source: 'rule:cost_over_budget',
      recommendation: 'Rivedi le campagne attive e richiedi un report ROI dettagliato all\'agenzia esterna. Sospendi le campagne con CPA > €180 fino a nuova analisi.',
    },
    {
      organizationId: org.id,
      severity: 'MEDIUM',
      status: 'RESOLVED',
      title: 'Crescita ricavi piatta da 4 mesi consecutivi',
      description: 'I ricavi mensili oscillano tra €46.200 e €47.800 da aprile a luglio, con una variazione massima mese su mese dello 0.8%. La crescita è de facto ferma.',
      source: 'rule:revenue_stagnant',
      recommendation: 'Valuta il lancio di un piano annuale scontato per convertire clienti mensili (potenziale +€12.000 MRR in 60 giorni). Identifica i top 20 clienti con potenziale upsell e assegna un account manager dedicato.',
    },
    {
      organizationId: org.id,
      severity: 'LOW',
      status: 'NEW',
      title: 'Clienti attivi in calo del 7.3% mese su mese',
      description: 'I clienti attivi sono passati da 301 a 279 nell\'ultimo mese (-7.3%). Il calo è concentrato nel segmento Small Business (piano Base), che registra il 68% delle disdette.',
      source: 'rule:customer_decline',
      recommendation: 'Analizza il funnel di onboarding per il piano Base: il 60% delle disdette avviene nei primi 30 giorni. Considera un onboarding guidato con una sessione 1-to-1 gratuita per i nuovi iscritti.',
    },
  ];

  let created = 0;
  for (const alert of alerts) {
    await prisma.alert.upsert({
      where: { organizationId_source: { organizationId: org.id, source: alert.source } },
      create: alert,
      update: alert,
    });
    created++;
  }

  console.log(`✅ Creati/aggiornati ${created} alert demo per ${org.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
