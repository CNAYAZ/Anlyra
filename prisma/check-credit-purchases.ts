/**
 * Conta gli ACQUISTI di crediti realmente avvenuti.
 *
 * PERCHÉ ESISTE: i crediti del piano e quelli acquistati sono stati separati in
 * due colonne (migration `20260904120000_ai_credits_purchased`). Quella
 * separazione parte dal presupposto — verificato allora sul CODICE — che nessun
 * acquisto fosse mai avvenuto, e che quindi tutto il saldo esistente di ogni
 * organizzazione fosse credito di PIANO. Questo script è la controprova sul
 * DATABASE, quella che il codice da solo non può dare.
 *
 * COSA GUARDA, e perché due fonti e non una:
 *  • CreditEntry con reason 'purchase' — il registro degli accrediti. È scritto
 *    da applyCreditPurchase (src/lib/billing/repository.ts), l'unico punto che
 *    accredita un pacchetto.
 *  • AuditLog con action 'credits.purchase' — la traccia scritta dal webhook
 *    Stripe. Esiste solo dal 22/08/2026 (migration `20260822200100_audit_log`),
 *    quindi da sola non basta, ma un acquisto registrato qui e non nel registro
 *    (o viceversa) è un'incoerenza che va vista.
 * Un acquisto vero lascia normalmente traccia in ENTRAMBE. Se i due numeri non
 * coincidono, non è un dettaglio: significa che una delle due scritture è
 * fallita, e vale la pena guardarci dentro prima di fidarsi del totale.
 *
 * ATTENZIONE, un limite da conoscere: prima del fix documentato in
 * repository.ts, esisteva un addCreditEntry() che scriveva la riga di registro
 * E BASTA, senza accreditare nulla di spendibile. Righe CreditEntry molto
 * vecchie possono quindi corrispondere ad acquisti mai diventati crediti veri.
 * Questo script conta le righe, non pretende di dire quanti crediti siano
 * ancora nel saldo: quel dato non esiste da nessuna parte, perché i CONSUMI non
 * vengono registrati in nessun registro.
 *
 * SOLA LETTURA: fa due conteggi e una somma, non scrive niente. Come
 * check-rls.ts, non richiede la guardia anti-produzione di prisma/guard.ts
 * (quella protegge i comandi DISTRUTTIVI) ed è anzi pensato per essere lanciato
 * proprio contro la produzione.
 *
 * USO:
 *   npx tsx prisma/check-credit-purchases.ts
 *   npm run db:check-purchases
 *
 * Esce 0 se non risulta nessun acquisto, 1 se ne risulta almeno uno — così può
 * essere usato come cancello in uno script, oltre che letto a occhio.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [entries, audits] = await Promise.all([
    prisma.creditEntry.count({ where: { reason: 'purchase' } }),
    prisma.auditLog.count({ where: { action: 'credits.purchase' } }),
  ]);

  console.log('Acquisti di crediti registrati:');
  console.log(`  CreditEntry con reason 'purchase'   : ${entries}`);
  console.log(`  AuditLog con action 'credits.purchase': ${audits}   (esiste solo dal 22/08/2026)`);

  if (entries === 0 && audits === 0) {
    console.log(
      '\nNESSUN ACQUISTO RISULTA MAI AVVENUTO.\n' +
        'Tutto il saldo attuale di ogni organizzazione è quindi credito di PIANO, e la colonna\n' +
        '"aiCreditsPurchased" che parte da 0 per tutti non toglie niente a nessuno.',
    );
    return;
  }

  // Somma dei crediti acquistati, utile solo per capire l'ordine di grandezza
  // di cosa c'è da controllare a mano: NON dice quanti di quei crediti siano
  // ancora nel saldo (i consumi non sono registrati da nessuna parte).
  const totale = await prisma.creditEntry.aggregate({
    where: { reason: 'purchase' },
    _sum: { delta: true },
  });

  console.error(
    `\nATTENZIONE: RISULTA ALMENO UN ACQUISTO (crediti accreditati in totale: ${totale._sum.delta ?? 0}).\n` +
      'Il presupposto su cui si regge la separazione delle colonne NON vale per queste\n' +
      'organizzazioni: parte del loro saldo "aiCredits" potrebbe essere credito che hanno\n' +
      'PAGATO, e trattarlo come credito di piano significa lasciarlo cancellare dal prossimo\n' +
      'rinnovo mensile.\n' +
      'Da fare, prima di dare per chiusa la faccenda: per ogni organizzazione coinvolta,\n' +
      'ricostruire a mano dagli acquisti quanto le spetta e spostarlo in "aiCreditsPurchased"\n' +
      'dal pannello admin (npm run admin -> Imposta crediti -> campo "Crediti acquistati").',
  );
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('[check-credit-purchases] errore durante il controllo:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
