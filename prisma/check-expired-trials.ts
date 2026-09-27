/**
 * Conta le aziende che nel database hanno ancora uno stato "in prova"
 * (BillingSubscription.status = "trialing") ma la cui prova è GIÀ FINITA.
 *
 * PERCHÉ ESISTE: fino al 2026-09-27 le due rotte di checkout
 * (src/app/api/billing/checkout e billing/credits/checkout) salvavano il codice
 * cliente Stripe insieme allo stato "in prova" inventato per la durata della
 * prova. Chi apriva la pagina di pagamento e poi la chiudeva restava "in prova"
 * per sempre, anche a prova finita: report, assistente AI e import gratis a
 * tempo indeterminato. Il codice ora non lo scrive più e non gli crede più
 * (getSubscription in src/lib/billing/repository.ts ricava la prova dalla sua
 * vera data di fine) — questo script dice QUANTE aziende erano in quella
 * situazione, cioè quante da quel deploy passano in sola lettura.
 *
 * COSA CONTA come "in prova con la prova scaduta":
 *   • stato scritto "trialing", SENZA un abbonamento Stripe collegato
 *     (quelli con un abbonamento Stripe li gestisce Stripe: non sono toccati);
 *   • e la data di fine prova dell'azienda è passata, oppure non c'è.
 * A parte, per informazione: quante righe "in prova" hanno invece un
 * abbonamento Stripe vero (una prova gestita da Stripe) — il codice non le
 * cambia.
 *
 * SOLA LETTURA: legge due tabelle e conta. Non scrive niente, non corregge
 * niente, non cancella niente. Come check-rls.ts e check-plan-columns.ts non ha
 * bisogno della guardia anti-produzione di prisma/guard.ts (quella protegge i
 * comandi DISTRUTTIVI) ed è pensato apposta per essere lanciato contro la
 * produzione.
 *
 * USO:
 *   npm run db:check-expired-trials
 *   npx tsx prisma/check-expired-trials.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const data = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeZone: 'Europe/Rome' });
const GIORNO_MS = 24 * 60 * 60 * 1000;

async function main() {
  console.log('AZIENDE "IN PROVA" CON LA PROVA GIÀ SCADUTA');
  console.log('===========================================\n');

  const adesso = new Date();
  const righe = await prisma.billingSubscription.findMany({
    where: { status: 'trialing' },
    select: { organizationId: true, plan: true, stripeSubscriptionId: true, stripeCustomerId: true },
  });
  const organizzazioni = await prisma.organization.findMany({
    where: { id: { in: righe.map((r) => r.organizationId) } },
    select: { id: true, name: true, trialEndsAt: true },
  });
  const orgPerId = new Map(organizzazioni.map((o) => [o.id, o]));

  const gestiteDaStripe = righe.filter((r) => r.stripeSubscriptionId);
  const senzaStripe = righe.filter((r) => !r.stripeSubscriptionId);
  const scadute = senzaStripe.filter((r) => {
    const fine = orgPerId.get(r.organizationId)?.trialEndsAt;
    return !fine || fine.getTime() <= adesso.getTime();
  });
  const ancoraInProva = senzaStripe.length - scadute.length;

  console.log(`Righe con stato "in prova" nel database: ${righe.length}`);
  console.log(`  - con un abbonamento Stripe vero (prova gestita da Stripe, non toccate): ${gestiteDaStripe.length}`);
  console.log(`  - senza abbonamento Stripe, prova ancora in corso (nessun cambiamento): ${ancoraInProva}`);
  console.log(`  - senza abbonamento Stripe, PROVA GIÀ SCADUTA: ${scadute.length}\n`);

  if (scadute.length === 0) {
    console.log('NESSUNA azienda aveva l\'accesso gratis oltre la prova. Niente da segnalare.');
    return;
  }

  console.log('ELENCO (fino al deploy della correzione avevano ancora tutto il prodotto attivo):\n');
  for (const r of scadute) {
    const org = orgPerId.get(r.organizationId);
    const fine = org?.trialEndsAt ?? null;
    const giorni = fine ? Math.floor((adesso.getTime() - fine.getTime()) / GIORNO_MS) : null;
    console.log(`  • ${org?.name ?? '(azienda non trovata)'}  [${r.organizationId}]`);
    console.log(
      `      prova finita: ${fine ? `${data.format(fine)} (${giorni} giorni fa)` : 'data non registrata'}` +
        ` · piano scritto: ${r.plan}` +
        ` · pagina di pagamento aperta: ${r.stripeCustomerId ? 'sì' : 'no'}`,
    );
    if (r.plan !== 'PRO') {
      console.log(
        '      ATTENZIONE: il piano non è quello di base. Potrebbe essere stato assegnato a mano\n' +
          '      dal pannello admin: da questa correzione anche questa azienda è in sola lettura.',
      );
    }
  }

  console.log(
    '\nCOSA SUCCEDE: dal deploy della correzione queste aziende sono trattate come prova\n' +
      'scaduta (sola lettura, niente report, niente AI, niente import) finché non scelgono un\n' +
      'piano. Il database NON viene modificato da questo script.',
  );
}

main()
  .catch((e) => {
    console.error('[check-expired-trials] errore durante il controllo:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
