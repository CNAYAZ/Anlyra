/**
 * Controlla le DUE colonne che dicono quale piano ha un'azienda, e se la
 * differenza fra loro sta facendo danni.
 *
 * PERCHÉ ESISTE: nel database ci sono due campi "piano" e non uno solo.
 *  • BillingSubscription.plan è QUELLO VERO: decide le funzioni disponibili, i
 *    limiti, e quanti crediti arrivano al rinnovo mensile.
 *  • Organization.plan è VECCHIO (legacy). Nasce con "STARTER", che non è
 *    nemmeno un piano che esiste nel listino. Nessuna decisione del prodotto lo
 *    legge più (verificato sul codice), ma resta nel database, si vede nel
 *    pannello admin e finisce nell'esportazione GDPR del cliente.
 *
 * COSA RISPONDE, in ordine:
 *  1. quante organizzazioni hanno un piano NON RICONOSCIUTO nella colonna vera
 *     (è questo, e solo questo, che può escluderle dal rinnovo mensile);
 *  2. quante hanno le due colonne DIVERGENTI;
 *  3. per ognuna, se la divergenza la sta escludendo dal rinnovo mensile
 *     oppure no — cioè se è un problema reale o solo una bruttura da sistemare
 *     con calma.
 *
 * COME FA A SAPERE SE UNA È ESCLUSA DAL RINNOVO: riproduce esattamente le due
 * condizioni che usa il lavoro notturno vero (src/lib/cron/credit-renewal.ts):
 * rinnova SOLO gli abbonamenti con stato "active", e SOLO se il piano scritto
 * su BillingSubscription.plan esiste nel listino (PLANS). Un'organizzazione
 * senza nessun abbonamento non viene rinnovata per progetto (è in prova), e
 * qui NON viene contata come problema.
 *
 * SOLA LETTURA: legge due tabelle e conta. Non scrive niente, non corregge
 * niente, non cancella niente. Come check-rls.ts e check-credit-purchases.ts
 * non ha bisogno della guardia anti-produzione di prisma/guard.ts (quella
 * protegge i comandi DISTRUTTIVI) ed è anzi pensato apposta per essere lanciato
 * contro la produzione.
 *
 * USO:
 *   npm run db:check-plans
 *   npx tsx prisma/check-plan-columns.ts
 *
 * Esce 0 se non c'è niente da fare, 1 se almeno un'organizzazione è davvero
 * esclusa dal rinnovo — così può essere usato come cancello in uno script,
 * oltre che letto a occhio.
 */
import { PrismaClient } from '@prisma/client';
import { PLANS, type PlanId } from '../src/lib/billing/plans';

const prisma = new PrismaClient();

/**
 * Gli stati di abbonamento che il rinnovo mensile accetta. Copiato da
 * RENEWABLE_STATUSES in src/lib/cron/credit-renewal.ts: se un giorno cambia lì,
 * va cambiato anche qui, altrimenti questo script racconta una cosa diversa da
 * quella che succede davvero.
 */
const STATI_CHE_RINNOVANO = ['active'];

/** Un piano è "riconosciuto" se esiste nel listino. Stessa prova di creditsForPlan(). */
function pianoRiconosciuto(piano: string | null | undefined): boolean {
  if (!piano) return false;
  return Boolean(PLANS[piano as PlanId]);
}

async function main() {
  console.log('CONTROLLO DELLE DUE COLONNE "PIANO"');
  console.log('===================================\n');

  const organizzazioni = await prisma.organization.findMany({
    select: { id: true, name: true, plan: true },
    orderBy: { createdAt: 'asc' },
  });

  if (organizzazioni.length === 0) {
    console.log('Nel database non c\'è nessuna organizzazione. Niente da controllare.');
    return;
  }

  const abbonamenti = await prisma.billingSubscription.findMany({
    select: { organizationId: true, plan: true, status: true },
  });
  const abbonamentoPerOrg = new Map(abbonamenti.map((a) => [a.organizationId, a]));

  console.log(`Organizzazioni nel database: ${organizzazioni.length}`);
  console.log(`Di queste, con un abbonamento registrato: ${abbonamenti.length}`);
  console.log(
    `Le altre ${organizzazioni.length - abbonamenti.length} non hanno nessun abbonamento: sono in prova,\n` +
      'e per progetto il rinnovo mensile non le tocca. Non sono un problema.\n',
  );

  const escluseDalRinnovo: string[] = [];
  const divergentiMaInnocue: string[] = [];
  const pianoVecchioNonValido: string[] = [];

  for (const org of organizzazioni) {
    const abb = abbonamentoPerOrg.get(org.id);

    // ── 1. La colonna VERA: è questa, e solo questa, che decide il rinnovo ──
    if (abb) {
      const rinnovabile = STATI_CHE_RINNOVANO.includes(abb.status);
      if (rinnovabile && !pianoRiconosciuto(abb.plan)) {
        escluseDalRinnovo.push(
          `  • ${org.name}\n` +
            `      piano scritto sull'abbonamento: "${abb.plan}" — NON riconosciuto\n` +
            `      stato abbonamento: ${abb.status}\n` +
            '      CONSEGUENZA: questa azienda NON riceve i crediti del suo piano al rinnovo mensile.',
        );
      }
    }

    // ── 2. La colonna VECCHIA: sporca o divergente, ma senza effetti ──
    if (!pianoRiconosciuto(org.plan)) {
      pianoVecchioNonValido.push(org.name);
    }
    if (abb && org.plan !== abb.plan) {
      divergentiMaInnocue.push(
        `  • ${org.name}: colonna vecchia "${org.plan}" / abbonamento vero "${abb.plan}" (stato: ${abb.status})`,
      );
    }
  }

  // ── RISPOSTA 1: il problema vero ──
  console.log('1) ORGANIZZAZIONI ESCLUSE DAL RINNOVO MENSILE');
  console.log('---------------------------------------------');
  if (escluseDalRinnovo.length === 0) {
    console.log(
      'NESSUNA. Ogni abbonamento attivo ha un piano riconosciuto, quindi il rinnovo\n' +
        'mensile li serve tutti. Questo è il controllo che conta: se qui c\'è scritto\n' +
        'NESSUNA, nessun cliente sta perdendo i crediti del suo piano.\n',
    );
  } else {
    console.log(
      `TROVATE ${escluseDalRinnovo.length}. Queste aziende NON stanno ricevendo i crediti\n` +
        'del loro piano, e nessuno se ne accorge da solo:\n',
    );
    console.log(escluseDalRinnovo.join('\n\n'));
    console.log(
      '\n  COSA FARE: dal pannello admin, scheda Organizzazioni, imposta il piano giusto\n' +
        '  per ognuna di queste. Il pannello scrive entrambe le colonne, quindi sistema\n' +
        '  sia il rinnovo sia la divergenza in un colpo solo.\n',
    );
  }

  // ── RISPOSTA 2: la colonna vecchia ──
  console.log('2) LA COLONNA VECCHIA (Organization.plan)');
  console.log('------------------------------------------');
  console.log(
    `Organizzazioni il cui piano VECCHIO non è un piano valido: ${pianoVecchioNonValido.length} su ${organizzazioni.length}`,
  );
  if (pianoVecchioNonValido.length > 0) {
    console.log(
      '  Questo è NORMALE e atteso: nessuna delle due strade con cui nasce\n' +
        '  un\'organizzazione scrive quel campo, quindi parte da "STARTER" per\n' +
        '  costruzione. NON è la causa di crediti mancanti: il rinnovo mensile non\n' +
        '  legge questa colonna (controllo 1 qui sopra).',
    );
  }
  console.log('');
  console.log(`Organizzazioni con le due colonne DIVERGENTI: ${divergentiMaInnocue.length}`);
  if (divergentiMaInnocue.length > 0) {
    console.log(divergentiMaInnocue.join('\n'));
    console.log(
      '\n  Nessuna di queste divergenze cambia cosa il cliente può fare o quanti\n' +
        '  crediti riceve: il prodotto legge solo la colonna dell\'abbonamento. Resta\n' +
        '  una bruttura visibile nel pannello admin e nell\'esportazione GDPR del\n' +
        '  cliente, da sistemare con calma, non un\'urgenza.',
    );
  }
  console.log('');

  // ── CONCLUSIONE ──
  console.log('IN UNA RIGA');
  console.log('-----------');
  if (escluseDalRinnovo.length === 0) {
    console.log(
      'Nessun cliente sta perdendo crediti per colpa del piano. Le due colonne\n' +
        'possono divergere, ma oggi la differenza non fa danni.',
    );
  } else {
    console.error(
      `ATTENZIONE: ${escluseDalRinnovo.length} azienda/e non ricevono i crediti del proprio piano.\n` +
        'Vanno sistemate a mano dal pannello admin, una alla volta.',
    );
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error('[check-plan-columns] errore durante il controllo:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
