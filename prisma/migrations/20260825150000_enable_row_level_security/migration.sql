-- Abilita Row Level Security (RLS) su TUTTE le tabelle dello schema public.
--
-- COSA PROTEGGEVA — fatto verificato il 25/08/2026: oltre a servire l'app via
-- Prisma, Supabase espone automaticamente un'API REST pubblica (PostgREST) su
-- ogni tabella dello schema `public`. Senza RLS, la sola chiave `anon` (quella
-- pubblica, pensata per il browser) bastava per interrogare qualunque tabella
-- da fuori dell'applicazione, bypassando completamente Next.js, l'autenticazione
-- e ogni controllo del codice. Prova eseguita quel giorno:
--   GET .../rest/v1/User?select=email   con la chiave anon
-- ha restituito l'email di un utente REGISTRATO VERO. Lo stesso valeva, in
-- linea di principio, per tutte le altre tabelle: Organization, FinancialRecord,
-- Receivable, ecc.
--
-- Lo stesso giorno RLS è stata abilitata A MANO, direttamente sul database di
-- produzione, su tutte le 52 tabelle allora presenti in `public`. Da quel
-- momento la stessa richiesta REST restituisce `[]` invece dei dati, e il sito
-- di produzione continua a funzionare normalmente (vedi più sotto perché).
--
-- QUESTA MIGRATION NON CAMBIA IL COMPORTAMENTO DI PRODUZIONE — lo mette per
-- iscritto. Prima di questa migration l'intervento viveva SOLO nello stato
-- attuale del database Supabase, in nessun file di git. Un database ricreato da
-- zero — un nuovo progetto Supabase quando arriverà quello di produzione
-- separato, un ripristino da un backup precedente al 25/08, un ambiente di
-- sviluppo futuro avviato da questa stessa migration history — tornerebbe con
-- tutte le tabelle esposte via API REST senza che nulla nel codice lo segnali.
--
-- PERCHÉ UN BLOCCO DINAMICO SU pg_tables E NON UN ELENCO FISSO DI 52 NOMI:
-- Un elenco esplicito fotografa le tabelle esistenti OGGI. Questo progetto
-- aggiunge tabelle regolarmente (quasi ogni migration finora ne crea una), e un
-- elenco fisso richiederebbe di essere tenuto aggiornato ad ogni nuova tabella —
-- esattamente il tipo di passo manuale, separato dal codice che crea la tabella,
-- che si dimentica: è così che si è arrivati alla situazione che questa
-- migration esiste per correggere. Il blocco PL/pgSQL sotto scorre `pg_tables`
-- ed esegue ENABLE ROW LEVEL SECURITY su OGNI tabella che trova in `public` nel
-- momento in cui questa migration viene applicata — inclusa `_prisma_migrations`
-- (la tabella di bookkeeping di Prisma stesso: includerla è innocuo, vedi sotto
-- perché non influenza Prisma in alcun modo).
--
-- ATTENZIONE — QUESTO NON PROTEGGE AUTOMATICAMENTE LE TABELLE FUTURE: le
-- migration Prisma vengono applicate UNA VOLTA SOLA e mai rieseguite. Una
-- tabella creata da una migration SUCCESSIVA a questa NON viene toccata da
-- questo blocco. Ogni nuova migration che crea una tabella deve abilitare RLS
-- su quella tabella esplicitamente (una riga:
-- `ALTER TABLE public."NomeTabella" ENABLE ROW LEVEL SECURITY;`), e
-- `prisma/check-rls.ts` (vedi anche CLAUDE.md, sezione Sicurezza) è lo script
-- pensato apposta per accorgersi se qualcuno se ne dimentica.
--
-- IDEMPOTENTE — SICURA DA RIESEGUIRE: questa migration verrà applicata da
-- `prisma migrate deploy` dentro `npm run build` su Vercel, quindi girerà su un
-- database dove RLS è GIÀ attiva su tutte le tabelle (l'intervento manuale del
-- 25/08 l'ha già fatto). In PostgreSQL, `ALTER TABLE ... ENABLE ROW LEVEL
-- SECURITY` non genera errore se è già abilitata: rieseguire questo blocco su
-- una tabella che ce l'ha già non fa nulla, non tocca una sola riga di dati, non
-- rischia di rompere il deploy.
--
-- PRISMA NON È INFLUENZATO: Prisma si connette con il ruolo proprietario delle
-- tabelle (lo stesso che le ha create nelle migration precedenti), e in
-- PostgreSQL il proprietario di una tabella bypassa RLS per definizione, a meno
-- di attivare esplicitamente FORCE ROW LEVEL SECURITY — che qui NON viene mai
-- usato. L'intera applicazione (ogni lettura e scrittura fatta via Prisma)
-- continua a funzionare esattamente come prima di questa migration.
--
-- NESSUNA POLICY VIENE CREATA, DI PROPOSITO: l'obiettivo di oggi è "nessuno
-- passa dall'API REST", e con RLS abilitata e ZERO policy quello è già il
-- risultato — senza una policy che lo conceda esplicitamente, ogni riga è
-- negata a qualunque ruolo diverso dal proprietario, `anon`/`authenticated`
-- inclusi. Se in futuro servisse esporre dati via API REST (per esempio un
-- client Supabase lato browser che legge direttamente una tabella), servirebbero
-- policy esplicite scoperte per organizzazione (tipicamente una clausola
-- `USING (organization_id = ...)` ancorata a un claim del JWT): è una decisione
-- del fondatore da prendere quando — e se — si presenterà quel caso d'uso, e non
-- fa parte di questa migration.
--
-- SAFETY: questa migration non crea, non modifica e non cancella nessuna
-- tabella, colonna o riga. Non può far perdere dati.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.tablename);
  END LOOP;
END $$;
