/**
 * Conta quanti account risultano membri di PIÙ di un'organizzazione.
 *
 * PERCHÉ ESISTE: oggi non c'è nessun limite nel codice al numero di
 * organizzazioni di cui un account può essere membro (tabella Membership,
 * nessun vincolo oltre a "una riga per coppia utente-organizzazione"). Il
 * fondatore non sa se questo sia già successo — e per saperlo servirebbe il
 * pannello admin, che non usa. Questo script guarda direttamente il database
 * e lo dice in chiaro, senza aprire nient'altro.
 *
 * NON decide se è un problema, e non introduce nessun limite: si limita a
 * mostrare cosa c'è. Un account con più organizzazioni può essere legittimo
 * (es. invitato in azienda di un cliente oltre alla propria) o essere lo
 * stesso account demo/di prova che ha creato più aziende dal modulo di
 * onboarding — lo script non distingue i due casi perché oggi il database
 * non registra "creata" separatamente da "ricevuta per invito" su Membership.
 *
 * SOLA LETTURA: solo query di lettura (count, findMany), nessuna scrittura e
 * nessuna cancellazione. Come check-rls.ts e check-credit-purchases.ts, non
 * richiede la guardia anti-produzione di prisma/guard.ts (quella protegge i
 * comandi DISTRUTTIVI) ed è pensato apposta per essere lanciato anche contro
 * la produzione, in qualsiasi momento.
 *
 * USO:
 *   npx tsx prisma/check-orgs-per-account.ts
 *   npm run db:check-orgs-per-account
 *
 * Esce 0 se nessun account ha più di un'organizzazione, 1 se ne trova almeno
 * uno — così può essere usato come cancello in uno script, oltre che letto a
 * occhio.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [totaleAccount, totaleOrganizzazioni] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
  ]);

  console.log('Account registrati in totale:      ' + totaleAccount);
  console.log('Organizzazioni esistenti in totale: ' + totaleOrganizzazioni);
  console.log('');

  // Un account per riga, con quante organizzazioni ha (una riga Membership
  // per coppia utente-organizzazione: contare le righe per userId equivale a
  // contare le organizzazioni di cui è membro).
  const conteggi = await prisma.membership.groupBy({
    by: ['userId'],
    _count: { organizationId: true },
  });

  const multiOrg = conteggi.filter((c) => c._count.organizationId > 1);

  if (multiOrg.length === 0) {
    console.log(
      'NESSUN ACCOUNT RISULTA MEMBRO DI PIÙ DI UN\'ORGANIZZAZIONE.\n' +
        'Ogni account che ha almeno un\'organizzazione ne ha esattamente una.',
    );
    return;
  }

  console.log(
    `TROVATI ${multiOrg.length} ACCOUNT MEMBRI DI PIÙ DI UN'ORGANIZZAZIONE:\n`,
  );

  for (const riga of multiOrg) {
    const utente = await prisma.user.findUnique({
      where: { id: riga.userId },
      select: { email: true },
    });
    const memberships = await prisma.membership.findMany({
      where: { userId: riga.userId },
      include: {
        organization: { select: { name: true, aiCredits: true, aiCreditsPurchased: true } },
      },
    });

    const nomiOrganizzazioni = memberships.map((m) => m.organization.name).join(', ');
    const creditiTotali = memberships.reduce(
      (somma, m) => somma + m.organization.aiCredits + m.organization.aiCreditsPurchased,
      0,
    );

    console.log(`  Email: ${utente?.email ?? '(utente non trovato, id ' + riga.userId + ')'}`);
    console.log(`  Organizzazioni: ${memberships.length} — ${nomiOrganizzazioni}`);
    console.log(`  Crediti AI totali in mano a questo account (somma di piano + acquistati su tutte le sue organizzazioni): ${creditiTotali}`);
    console.log('');
  }

  console.error(
    'ATTENZIONE: gli account elencati sopra hanno accesso a più di un\'organizzazione.\n' +
      'Questo script non dice se sia voluto (es. un invito) o un abuso (es. più aziende\n' +
      'create dallo stesso account) — quella distinzione va fatta a mano, caso per caso.',
  );
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('[check-orgs-per-account] errore durante il controllo:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
