/**
 * Verifica che OGNI tabella dello schema `public` abbia Row Level Security
 * (RLS) abilitata.
 *
 * PERCHÉ SERVE UN CONTROLLO SEPARATO DALLA MIGRATION: la migration
 * `20260825150000_enable_row_level_security` abilita RLS sulle tabelle che
 * esistono nel momento in cui viene applicata. Le migration Prisma vengono
 * eseguite UNA VOLTA SOLA e mai rieseguite: una tabella creata da una
 * migration successiva a quella non viene toccata. Se chi scrive quella
 * migration futura dimentica la riga `ENABLE ROW LEVEL SECURITY`, questo è
 * l'unico modo per accorgersene — non c'è nessun controllo automatico nel
 * codice applicativo che lo farebbe da solo.
 *
 * SOLA LETTURA: interroga `pg_tables`, non scrive nulla e non richiede la
 * guardia anti-produzione di `prisma/guard.ts` (quella protegge comandi
 * DISTRUTTIVI; questo non lo è). È anzi pensato per essere lanciato proprio
 * contro il database di produzione, ogni volta che serve controllare.
 *
 * PERCHÉ NON UN CRON: il piano Vercel Hobby permette solo 2 cron, entrambi già
 * occupati (trial-check, gdpr-purge). Questo resta uno script da lanciare a
 * mano — dopo un deploy che aggiunge tabelle, o come controllo periodico
 * manuale — non un controllo automatico continuo.
 *
 * USO:
 *   npx tsx prisma/check-rls.ts
 *   npm run db:check-rls
 *
 * Esce con codice 0 se tutte le tabelle sono coperte, 1 se ne manca almeno una
 * (o se il controllo stesso fallisce) — utilizzabile anche come gate in uno
 * script di CI futuro, se si deciderà di aggiungerne uno.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type UnprotectedRow = { tablename: string };

async function main() {
  const unprotected = await prisma.$queryRaw<UnprotectedRow[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = false
    ORDER BY tablename
  `;

  if (unprotected.length === 0) {
    console.log('OK — Row Level Security è attiva su tutte le tabelle dello schema "public".');
    return;
  }

  console.error(
    `ATTENZIONE — ${unprotected.length} tabella/e in "public" SENZA Row Level Security:\n`,
  );
  for (const row of unprotected) {
    console.error(`  - ${row.tablename}`);
  }
  console.error(
    '\nQueste tabelle sono raggiungibili dall\'API REST pubblica di Supabase (PostgREST) con la ' +
      'chiave "anon", bypassando completamente l\'applicazione. Per correggere, aggiungere una ' +
      'migration con, per ciascuna:\n' +
      '  ALTER TABLE public."NomeTabella" ENABLE ROW LEVEL SECURITY;\n' +
      '(Prisma non ne risente: si connette come proprietario delle tabelle, che bypassa RLS ' +
      'per definizione.)',
  );
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('[check-rls] errore durante il controllo:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
