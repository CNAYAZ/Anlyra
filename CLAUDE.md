# CLAUDE.md — Guida operativa per sessioni di sviluppo Anlyra

> ## ⛔ FERMO — IL DATABASE È QUELLO DEL SITO ONLINE
>
> **C'è UN SOLO database Supabase** (project ref `ikthodgtxflhiykgpcnr`) e serve sia lo
> sviluppo sia **anlyra.com in produzione**. Dentro ci sono **utenti registrati veri**.
> Non esiste un database "di prova": ogni comando parte sui dati dei clienti.
>
> **MAI lanciare, né dal Codespace né da un container:**
> `npm run db:seed` · `npx prisma db seed` · `npx tsx prisma/seed-*.ts` ·
> `npm run prisma:migrate` (`prisma migrate dev`) · `npm run db:push` / `prisma:push`
> (`prisma db push`) · `prisma migrate reset`.
> I quattro script di seed fanno `deleteMany` su 10 tabelle; `migrate dev` e `db push`
> possono azzerare o riscrivere lo schema. Non sono reversibili.
>
> **Esiste una guardia che li blocca**: [`prisma/guard.ts`](prisma/guard.ts) (VERIFICATO
> 2026-08-11). Riconosce il database dall'identificativo dentro `DATABASE_URL`/`DIRECT_URL`
> — controlla l'ambiente della shell **e** i file `.env` / `.env.local` / `prisma/.env`,
> perché ogni comando ne legge uno diverso — e **blocca prima di collegarsi**: se una sola
> di quelle sorgenti punta alla produzione, il comando muore con exit 1 senza toccare
> niente. È **fail-closed**: blocca anche se non trova nessuna URL o se trova un database
> remoto che non conosce. Passa solo host locali e i ref elencati come non-produzione.
> Non si basa su `NODE_ENV` (in locale è sempre `development` anche puntando alla produzione).
>
> **Se serve DAVVERO scrivere in produzione**: prima backup da Supabase
> (Database → Backups), poi lo sblocco **sulla stessa riga** del comando, così vale solo
> per quello e non resta attivo:
>
> ```
> ALLOW_PROD_DB_WRITE=yes npm run db:seed
> ```
>
> **Non** esportare `ALLOW_PROD_DB_WRITE` nella shell, **non** metterlo in un `.env`,
> **non** aggiungerlo alle variabili di Vercel: se resta attivo la protezione non serve più
> a niente. Quando arriverà un progetto Supabase separato, aggiornare le due costanti in
> cima a `prisma/guard.ts` (`PRODUCTION_DATABASE_IDS`, `NON_PRODUCTION_DATABASE_IDS`).
>
> `npm run build` (che esegue `prisma migrate deploy`) **NON** è guardato ed è corretto
> così: applicare le migrazioni in avanti è quello che il deploy deve fare. Vedi §3.

---

> Contesto operativo per le future sessioni Claude Code. Versione **v5.1** (2026-09-04).
> Leggere PRIMA di toccare codice. Ogni affermazione di stato è marcata
> **VERIFICATO** (controllato su codice/DB/runtime alla data indicata) o **DA VERIFICARE**.
>
> **Regola zero: la verità è nel codice e nel database, non nei file `.md`.**
> Prima di fidarti di qualsiasi documento (incluso questo), verifica sulla fonte.

---

## 1. Identità progetto

**Anlyra** è un consulente AI per PMI: legge i dati reali dell'azienda (entrate, spese,
crediti, spese ricorrenti) e dà consigli ancorati a quei numeri. Il valore è l'aggancio
ai dati reali: un consiglio generico è un oroscopo, un consiglio sui numeri veri del
cliente è il prodotto.

- **Branch principale di sviluppo**: `claude/merge-repos-nextjs-rOZU3` (HEAD al 2026-09-05: `b9a52f8`).
- **Stack** (VERIFICATO su `package.json`, 2026-09-05): Next.js 16.2.12 con Turbopack — NON
  14.2.18 come diceva questa riga fino al 2026-09-04, uno scarto di due versioni maggiori
  (App Router, `src/`), React 19.2.8, TypeScript 5.6.3, next-intl (IT primaria, EN
  secondaria), Prisma 5.22 su PostgreSQL (Supabase — vedi §3), NextAuth v5 beta (JWT,
  `next-auth@5.0.0-beta.31`), Anthropic SDK, Stripe, Resend (email transazionali), Upstash
  rate-limit, Tailwind 3.4 + shadcn.
- **Online**: deploy Vercel su dominio `anlyra.com` (NON `anlyra.vercel.app` come diceva
  questa riga: il fallback hardcoded in `src/app/layout.tsx`, `robots.ts`, `sitemap.ts` e
  nei testi legali è `https://anlyra.com`, coerente con l'avviso in cima a questo file —
  VERIFICATO sul codice 2026-09-05, ma la raggiungibilità live NON è stata verificata a
  runtime in questa sessione: la rete in uscita di questo container blocca l'accesso al
  dominio, quindi resta DA VERIFICARE dal fondatore).
- **Demo org**: "Acme Analytics" (id: `demo-org`, slug `acme` — VERIFICATO su
  `src/lib/demo/data.ts`, il dataset usato da `prisma/seed.ts`). L'accesso con le
  credenziali di `demo@pro.app` è stato DISATTIVATO il 2026-09-05
  (`src/auth.ts`, errore dedicato `DEMO_LOGIN_DISABLED`): una password non è più una via
  d'ingresso, quindi non è più riportata qui. L'unico modo di entrare nella demo oggi è il
  pulsante "prova la demo", che imposta solo un cookie di sola lettura
  (`hasDemoSession`/`DEMO_COOKIE` in `src/lib/session.ts`) e non crea nessuna sessione
  scrivibile.
- **Documento gemello**: [`.vscode/STATO-REALE-E-VALUTAZIONE.md`](.vscode/STATO-REALE-E-VALUTAZIONE.md)
  — valutazione onesta dello stato del progetto letta dal codice (cosa è vero, cosa è
  scenografia, opinione da collega). Questo CLAUDE.md sono le istruzioni operative;
  quello è la fotografia e il giudizio. Non duplicarli: leggerli entrambi.
- **Decision log**: [`docs/decisions/`](docs/decisions/) — `product-direction.md`
  (PRODUCT-001), `credit-pack-pricing.md`, `data-import-architecture.md`.
  Le decisioni le prende il fondatore; Claude propone, non decide.

## 2. Come lavora il fondatore

Il fondatore (cnayaz) **non è tecnico** e **non ha accesso al repository dal suo
ambiente principale**. Regole di collaborazione:

- Claude fa tutto il lavoro tecnico e spiega in **italiano semplice**.
- Comandi da eseguire: **UNA riga, uno alla volta**, **il comando COMPLETO pronto da
  incollare** — mai un comando che presuppone conoscenze di git o un pezzo da
  completare a mano — e **dopo ogni comando, cosa deve stampare se è andato bene**.
  Niente `!` nei one-liner bash (history expansion li rompe).
- Un consiglio è un consiglio, non un ordine: **decide il fondatore**. Nessuna sessione
  riscrive il piano perché le sembra giusto.
- **Un mattone alla volta**: una modifica, provata, mergiata, verificata sul server.
- **Mai committare sul branch di produzione `claude/merge-repos-nextjs-rOZU3`.** Ogni
  lavoro va su un branch nuovo (la regola tecnica — branch feature + merge `--no-ff` —
  è in §6); il merge è un gesto del fondatore, ed è l'unico momento in cui decide lui
  cosa va online. Quando dici che una cosa è fatta, **specifica sempre se è committata
  sul branch o già in produzione**: per lui sono due cose diverse e solo la seconda
  conta.
- Quando dici "fatto", **PROVALO**: `git log` del commit atteso, `cat` del file, output
  reale dei comandi. Mai spuntare una casella senza output. Il **rapporto finale** va
  scritto in **UN SOLO blocco di testo copiabile**, senza tabelle né link, e deve
  sempre contenere: branch, `git log`, conferma del push, file toccati, output delle
  verifiche, scostamenti fra il compito e la realtà del codice, decisioni prese in
  autonomia, e cose viste ma non toccate.
- La prova che un dato persiste è una **rilettura dal DB**, mai l'UI ottimistica.
- Prima di un fix sui dati, verificare **quali colonne il codice legge davvero**
  (caso storico `tone`/`impact`: il codice leggeva colonne diverse dal previsto).
- **I commenti nel codice non sono più affidabili delle affermazioni in questo file.**
  È già accaduto che un commento presentasse come scelta deliberata l'aggiramento di
  un difetto scoperto e non segnalato. Un commento che giustifica una scelta strana va
  verificato sul codice, non preso per buono.
- **Un riferimento a file e riga dentro un compito può essere sbagliato o superato.**
  Successo più volte in questa sessione (una riga "~95" era in realtà alla 112; un
  conteggio di route "11" erano in realtà 12; un elenco di vulnerabilità dato per
  "10 — 3 critical" erano 13, zero critical). Verificare SEMPRE il riferimento prima di
  toccarlo, e se non corrisponde: correggerlo silenziosamente non va bene, va segnalato
  nel rapporto — chi ha scritto il compito deve sapere che il suo riferimento non
  reggeva, non solo vedere il risultato finale.
- Riportare sempre il nome REALE del branch pushato, e dichiarare l'ambiente
  (container remoto vs Codespace) a inizio report.
- **Prima di iniziare un lavoro nuovo, leggere
  [`.vscode/SCOPERTE-DA-VALUTARE.md`](.vscode/SCOPERTE-DA-VALUTARE.md)**: l'elenco delle
  cose notate durante le sessioni precedenti e non ancora affrontate.

## 3. Ambiente e database

**Due ambienti possibili** — dichiarare sempre quale:
- **Codespace del fondatore**: `CODESPACE_NAME` valorizzato, working dir `/workspaces/Anlyra`.
  Qui gira il server dev (terminale col loop di auto-riavvio).
- **Container remoto Claude Code**: `CODESPACE_NAME` vuoto, working dir `/home/user/Anlyra`.
  I file gitignored (es. `.env`) NON viaggiano tra ambienti: viaggia solo git.

**DATABASE (VERIFICATO 2026-09-05)**: **Supabase PostgreSQL**, NON più SQLite.
- `prisma/schema.prisma`: `provider = "postgresql"`, `url = env("DATABASE_URL")`,
  `directUrl = env("DIRECT_URL")` (pooler eu-west-1).
- 11 migration applicate (contate su `prisma/migrations/`, non più 3 come diceva questa
  riga fino al 2026-09-04): `20260702225830_init_postgres`, `20260710231614_billing_tables`,
  `20260712142054_repoint_integration_fk_drop_org_b12`, `20260726190000_gdpr_deletion_requested_at`,
  `20260728180000_report_config_and_share_token`, `20260821120000_insight_source`,
  `20260822200000_stripe_webhook_idempotency`, `20260822200100_audit_log`,
  `20260823120000_credits_renewed_at`, `20260825150000_enable_row_level_security`,
  `20260904120000_ai_credits_purchased`.
- **`npm run build` esegue `prisma migrate deploy` PRIMA della build**: ogni build tocca
  il database remoto. Pensarci prima di lanciare build "di prova".
  **`build` NON è coperto dalla guardia** (vedi riquadro in cima), per scelta:
  `migrate deploy` applica solo le migrazioni mancanti in avanti — non cancella dati e non
  azzera lo schema, al contrario di `migrate dev`/`migrate reset` — e Vercel deve poterlo
  fare a ogni deploy. Guardarlo avrebbe costretto a tenere `ALLOW_PROD_DB_WRITE=yes`
  impostata **in permanenza** su Vercel, e una volta lì quella variabile avrebbe disarmato
  la protezione anche per tutto il resto. La guardia copre solo i comandi distruttivi
  lanciati **a mano**.
- **Comandi distruttivi guardati** (VERIFICATO 2026-09-05, invariato dal 2026-08-11): i 4 seed
  (`prisma/seed.ts`, `seed-alerts.ts`, `seed-insights.ts`, `seed-receivables.ts` — la
  guardia è chiamata a livello di modulo, quindi copre anche `npx prisma db seed`) più
  `db:push`, `prisma:push`, `prisma:migrate` (guardia come primo comando dello script npm:
  se blocca, la CLI Prisma non parte nemmeno).
- Oggi lo **stesso progetto Supabase** serve sviluppo e servirà produzione. PRIMA del
  lancio serve un progetto separato per la produzione (deciso dal fondatore: per ora
  se ne tiene uno solo).
- Conseguenza: la vecchia lezione "il DB non viaggia tra ambienti" vale ormai **solo per
  i file gitignored** — i dati sono su Postgres remoto, raggiungibile da qualsiasi
  ambiente con le credenziali. Un fix dati fatto dal container arriva ovunque.

**Env file**: `.env` e `.env.local`, con priorità a `.env.local` (VERIFICATO 2026-09-05 sul
commento in `prisma/guard.ts`). Esiste anche un terzo percorso, `prisma/.env`, che la
guardia legge come possibile fonte ma che questa riga non nominava: verificato che
`prisma/guard.ts` controlla tutti e tre. Considerarli quando si cerca la sorgente di una
variabile. **MAI committare `.env`**.
**MAI impostare `AUTH_URL`/`NEXTAUTH_URL` in sviluppo** (self-proxy loop → 500 dopo 30s,
vedi `docs/dev-codespace-proxy-500.md`).

**Server dev**: gestore UNICO, il terminale col loop di auto-riavvio nel Codespace.
MAI `npm run dev` diretto. Per riavviare: `pkill -f "next dev"` e attendere ~20s.

## 4. Comandi utili (VERIFICATI su package.json, 2026-09-05)

```
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .   (NON "next lint" come diceva questa riga fino al
                        #  2026-09-04: "next lint" non è più lo script — next 16 lo ha
                        #  deprecato, il progetto è già passato a chiamare eslint diretto)
npm run build          # ATTENZIONE: prisma migrate deploy + next build (tocca il DB remoto)
npm run db:seed        # tsx prisma/seed.ts
npm run db:generate    # prisma generate (anche in postinstall)
npm run prisma:migrate # tsx prisma/guard.ts ... && prisma migrate dev (guardato, vedi §3)
```

## 5. Struttura del codice

Pagine in `src/app/[locale]/` — gruppi `(public)` e `(dashboard)`, più auth
(login, signup, verify-email, forgot/reset-password, invite, onboarding, welcome),
pricing, legal, share. API in `src/app/api/` (~80 route).

**Menu ATTIVE** (VERIFICATO su `src/components/dashboard/nav-config.ts`):
Overview · Situazione · Finance (revenue/costs/cashflow/budget) · AI (chat/insights/
forecasting/benchmarks/alerts) · AI Agent · Custom Dashboards · Reports · Data
(import/manual/history) · Scadenzario · Spese ricorrenti · Integrations · Settings
(profile/organization/team/billing/security/notifications).

**Menu DISATTIVATE** (commentate in nav-config il 2026-06-30, pagine e API restano nel
repo): **Mercato** (competitors/trends/positioning) e **Operations**
(customers/team/efficiency) — motori sintetici, vedi §9.

**Helper condivisi — usarli, non reinventarli** (VERIFICATI):
- `src/lib/api/response.ts` → `ok(data)` / `fail(error, status)` per le risposte API.
  (Esiste anche il legacy `src/lib/api-response.ts` con le stesse firme.)
- `src/lib/api/fetcher.ts` → `apiFetch<T>(path)` lato client.
- `src/lib/session.ts` → `getAuthContext()` (null se non autenticato),
  `getCurrentContext()`, `getSessionState()`, `getCurrentOrganization()`.
- `src/lib/auth/require-role.ts` → `MANAGER_ROLES = ['owner','admin']`,
  `isManagerRole()`, `requireManagerRole(ctx)` (fail-closed, 403).
- `src/lib/timezone.ts` → `APP_TIME_ZONE = 'Europe/Rome'`, `toAppDateString()`,
  `appDateStartUTC()`.
- `src/lib/facts/financial-facts.ts` → `getFinancialFacts(orgId)` (motore a regole,
  fatti reali senza AI) e `daysOverdueOf(dueDate, now)`.
- `src/lib/ai-context.ts` → `loadBusinessContext(orgId)` + `buildSystemPrompt()`;
  prompt tematici in `src/lib/ai/prompts/` (chat, financial, marketing, kpi, competitor).
- DTO: `src/lib/receivables/dto.ts` (`effectiveStatus`), `src/lib/recurring-expenses/dto.ts`
  (`computeTotals`). Import: `src/lib/import/` (incl. `batch-fk.ts`, vedi §9).

## 6. Regole di codice (invariate, ancora valide)

- **Logout**: sempre reload assoluto `window.location.href = /api/auth/logout?locale=${locale}`.
  Mai `router.push`/`router.replace`.
- **Tabular nums** su ogni numero visualizzato. **No emoji** nella UI di prodotto.
- **Token shadcn** (`--background`, `--foreground`, `--card`, …): non rinominare.
- **Branch feature + merge `--no-ff`** sempre; verifica finale con `git ls-remote`/`git log`.
- **Modelli Prisma zombie** (`User_b4`, `Organization_b5`, `Competitor_b7`, …): non usarli
  in query nuove, non rimuoverli dalle migration. ATTENZIONE alle eccezioni in §9.
- **Onestà nei documenti**: distinguere sempre "implementato" da "pianificato",
  "verificato" da "letto".

## 7. Regole di sicurezza (dalle correzioni di luglio 2026)

**Ruoli** (VERIFICATO 2026-09-05): valori reali lowercase `'owner' | 'admin' | 'editor' |
'viewer'` su `Membership.role`, letti da `src/lib/auth/require-role.ts`. Decisione del
fondatore: **cancellare dati e cambiare impostazioni org = solo owner/admin; leggere e
creare/modificare dati = tutti i membri.**
- `requireManagerRole` blocca (403) in 12 file/13 punti di chiamata (VERIFICATO con grep,
  2026-09-05 — non più 11 come diceva questa riga: mancava `reports/[id]/share`): le 6
  DELETE già elencate in precedenza (receivables, recurring-expenses, reports,
  custom-dashboards, data/import/batches, market/competitors), PATCH
  `settings/organization`, le 4 route integrazioni (connect, disconnect, sync,
  frequency), e le 2 chiamate di `reports/[id]/share` (POST che crea il link
  condivisibile, DELETE che lo revoca — "il link espone il fatturato dell'azienda",
  commento nel file). C'è anche una TERZA chiamata in `reports/[id]/route.ts` (GET), ma
  NON blocca nessuno: decide solo se includere il token nella risposta
  (`canSeeToken = !requireManagerRole(...)`), quindi non va contata come guardia.
- **Ogni nuova azione distruttiva DEVE usare `requireManagerRole`.**
- Nota onesta: il blocco per un utente `viewer` è attivo nel codice ma **NON è ancora
  stato provato dal vivo** (DA VERIFICARE); verificato invece a runtime che un `owner`
  può ancora cancellare.
- **`editor` e `viewer` si comportano in modo IDENTICO oggi** (VERIFICATO 2026-09-05,
  nessun punto del codice li distingue): nessuna guardia impedisce a un `viewer` di
  creare o modificare dati, nonostante il nome suggerisca sola lettura — quella
  distinzione non è implementata. Vedi `.vscode/SCOPERTE-DA-VALUTARE.md`.
- Nello schema `Membership.role` ha `@default("owner")` — da cambiare in `'viewer'`
  (default sicuro) quando si costruirà la gestione team.
- **La fatturazione (portale Stripe, checkout abbonamento, checkout pacchetti crediti)
  è riservata al solo `owner`** (VERIFICATO 2026-09-05): `requireOwnerRole`/
  `OWNER_ROLES` in `src/lib/auth/require-role.ts`, un controllo SEPARATO da
  `requireManagerRole` (che ammette anche `admin`), applicato alle tre rotte
  `api/billing/checkout`, `api/billing/credits/checkout`, `api/billing/portal`. Lato
  interfaccia, `settings/billing/page.tsx` disattiva (non nasconde) i pulsanti per chi
  non è owner, con spiegazione — l'informazione di ruolo arriva dal layout dashboard
  via un context dedicato (`src/lib/auth/owner-context.tsx`), stesso schema già usato
  per `isDemo`.
- **Chi CREA un'organizzazione ne diventa `owner`, non più `admin`** (VERIFICATO
  2026-09-05, `src/app/api/onboarding/organization/route.ts`): prima di questa
  correzione il creatore riceveva `admin`, che con la riga sopra lo avrebbe escluso dal
  portale di fatturazione della propria stessa azienda. **Le organizzazioni create
  PRIMA di questa correzione hanno ancora il creatore come `admin`**: non esiste un
  modo per contarle con certezza dal solo `Membership.role` (un `admin` può anche
  essere un invitato legittimo — vedi `.vscode/SCOPERTE-DA-VALUTARE.md`, il campo
  `createdByUserId` non esiste), quindi vanno corrette a mano, una alla volta, dal
  fondatore. Il pannello admin ha ora un modulo apposta: scheda **Organizzazioni**,
  elenco membri sotto la tabella (email + ruolo), modulo "Cambia ruolo di un membro
  (per email)" — vedi §12.

**Niente dati finti al modello o nel DB** (VERIFICATO 2026-09-05):
- La finta sync Stripe è neutralizzata: `src/lib/sync/providers/stripe.ts` delega a
  `makeStubProvider` (prima scriveva record CASUALI in FinancialRecord).
  **Non reintrodurre generatori di dati finti.**
- `/api/integrations/[provider]/connect` ritorna 503 "Integration not available yet":
  non salva chiavi, non marca CONNECTED, non forza il piano PRO. UI: provider "in arrivo".
- Il contesto AI (`ai-context.ts` + i 5 prompt-builder) non passa più KPI né competitor
  hardcoded dal seed (churn 4.2, NPS 42, Alpha/Beta/Gamma): passa i fatti di
  `getFinancialFacts`, il riepilogo scadenzario e le spese ricorrenti.
  **REGOLA: mai passare al modello dati sintetici o hardcoded.**

**Niente numeri finti nemmeno in interfaccia** (VERIFICATO 2026-09-05, motore in
`src/lib/analysis/financial.ts`): lo stesso principio della sezione sopra, esteso ai
numeri che l'utente VEDE, non solo a quelli passati al modello.
- Margini e crescita mensile non sono più mai `0` per mancanza di dati o denominatore
  zero: sono `null`, e la UI mostra "non calcolabile" invece di una percentuale precisa
  ma falsa (uno `0%` di margine dichiara pareggio, uno `0%` di crescita dichiara
  stagnazione — nessuno dei due è vero quando il dato manca).
  **REGOLA: mai far ricadere un valore non calcolabile su 0.**
- Runway, LTV e tasso di abbandono inventati sono stati rimossi: il runway presumeva un
  saldo di cassa che lo schema non registra (nessun concetto di saldo iniziale), quindi
  non è MAI calcolabile con un numero reale — resta solo il fatto binario "sta bruciando
  cassa sì/no". LTV assumeva una vita cliente di 24 mesi o un tasso di abbandono del 5%
  quando nessuno aveva ancora disdetto: ora `null` invece di un numero credibile ma
  inventato.
- Il filtro di periodo ora governa DAVVERO ogni numero mostrato (prima i totali in
  alto restavano quelli dell'ultimo mese, ignorando il periodo selezionato). Le finestre
  "N mesi" sono calendario preciso (mese in corso, dal giorno 1 a oggi, più gli N-1 mesi
  completi precedenti — non più "1 mese" = 34 giorni per un bug di calcolo). I confronti
  periodo-su-periodo confrontano finestre della stessa durata E la stessa ora del giorno
  (non un mese intero contro un mese parziale), e il mese-su-mese confronta i due mesi
  che dichiara di confrontare, cercandoli per nome (`"YYYY-MM"`), non per posizione in un
  array — un mese senza dati produceva confronti con il mese sbagliato.
- Rimosse dalla landing e dai piani le affermazioni che il prodotto non mantiene:
  testimonianze inventate ("Marco C.", "Giulia R.", "Andrea T.") e la promessa di
  "alert automatici" (non esiste nessun cron che li spinge — `vercel.json` pianifica
  solo `trial-check` e `gdpr-purge` — gli alert si calcolano solo quando l'utente preme
  "Aggiorna").
- **Crediti di piano vs crediti acquistati** (`Organization.aiCredits` /
  `aiCreditsPurchased`, colonne separate dalla migration `20260904120000_ai_credits_purchased`):
  prima vivevano nella stessa colonna, e un pacchetto pagato non speso spariva al primo
  rinnovo mensile (che sovrascrive `aiCredits`). Ora `aiCreditsPurchased` non viene mai
  sovrascritta da nessuno; il consumo spende prima il piano poi gli acquistati (un'unica
  istruzione SQL con controllo di capienza nella `WHERE`, provata contro Postgres reale
  con 40 consumatori simultanei su 10 crediti: esattamente 10 riescono). Ovunque il saldo
  sia mostrato o decida se una funzione è disponibile è la SOMMA delle due colonne
  (`getCreditBalance`). Nessun acquisto era mai avvenuto prima della migration (verificato
  con `prisma/check-credit-purchases.ts`, sola lettura): la colonna nuova parte da 0 per
  tutti, nessun saldo alterato.

**Email di prova non scrivono più a chi ha già pagato** (VERIFICATO 2026-09-05,
`src/lib/cron/trial-check.ts`): il cron selezionava le organizzazioni candidate solo su
`Organization.trialEndsAt` (scritto una volta all'onboarding, mai azzerato), senza mai
consultare `BillingSubscription` — un cliente abbonato a metà prova continuava a ricevere
"la tua prova sta per finire" ben oltre l'abbonamento vero. Ora le organizzazioni con un
abbonamento `active` o `past_due` sono escluse a prescindere da `trialEndsAt`, e
`trialEndsAt` viene azzerato in ogni punto in cui un abbonamento diventa davvero attivo
(webhook Stripe, e `admin/actions.ts` quando il fondatore assegna un piano a mano). Il
piano e il prezzo nelle email ora vengono da `BillingSubscription.plan` (via
`getSubscription()`) e dal listino vero (`PLANS`/`plans.ts`), non più da
`Organization.plan` (legacy, default `"STARTER"`) con una tabella di nomi/prezzi scritta
a mano e scollegata dal listino. Residui noti, non risolti: nessuna email di "win-back"
per chi disdice, e le email restano tutte in italiano fisso anche per utenti con
`locale: 'en'` — vedi `.vscode/SCOPERTE-DA-VALUTARE.md`.

**Escape del testo utente in ogni email** (VERIFICATO 2026-09-05,
`src/lib/email/templates/`): 11 dei 12 modelli incollavano testo scelto dall'utente
(nome, nome organizzazione, nome di chi invita, titolo report) direttamente nell'HTML
senza escape — il più esposto, `team-invite.ts`, metteva il nome di chi invita anche
nell'OGGETTO dell'email. Chiunque si registrasse poteva far partire email dal dominio
verificato di Anlyra con oggetto e corpo sotto il proprio controllo. Una sola funzione di
escape (`src/lib/email/templates/_escape.ts`); `baseLayout` (`_layout.ts`) applica
l'escape una volta sola a `title`/`preheader`/`ctaButton.label`/`userEmail` — ogni
modello resta responsabile di escapare i valori che compone dentro il proprio `content`,
che `baseLayout` non tocca. **ATTENZIONE**: passare a `baseLayout` un valore GIÀ escapato
produrrebbe un doppio escape — nessun chiamante lo fa oggi (verificato), ma è un rischio
per codice futuro, non solo teorico. **REGOLA: mai passare testo utente non escapato a un
template email; mai pre-escapare prima di chiamare `baseLayout`.**

**Guardie sull'onboarding** (VERIFICATO 2026-09-05): tre porte chiuse nella stessa serie
di lavori — l'account demo non può più creare un'organizzazione per uscire dalla gabbia
di sola lettura (`api/onboarding/organization` ora riconosce `demo@pro.app` per identità,
prima di risolvere un'organizzazione da controllare); nessuna delle due pagine di
creazione azienda (`onboarding/page.tsx` e `onboarding/organization/page.tsx`, quest'ultima
raggiungibile da `/welcome`) è più un ingresso libero per chi ha già un'organizzazione —
redirect a `/overview`. La seconda pagina è un Client Component: la guardia vive in un
`layout.tsx` nuovo accanto ad essa, non nella pagina stessa.

**Fuso orario** (VERIFICATO 2026-09-05): le date sono salvate in UTC come mezzanotte ITALIANA —
`toISOString().slice(0,10)` restituisce il giorno SBAGLIATO. Usare SEMPRE gli helper di
`src/lib/timezone.ts` (`toAppDateString`, `appDateStartUTC`) per date visibili all'utente
o passate all'AI; i giorni di ritardo si calcolano solo con `daysOverdueOf`.

**Row Level Security (RLS) su Supabase** (abilitata e VERIFICATA il 2026-08-25, fatti di
base RIVERIFICATI 2026-09-05: la migration e `check-rls.ts` esistono ancora, nessuna
policy è stata aggiunta nel frattempo): oltre a servire l'app via
Prisma, Supabase espone automaticamente un'API REST pubblica (PostgREST) su ogni tabella
dello schema `public`. Senza RLS, la sola chiave `anon` bastava per leggere dati veri
bypassando completamente l'applicazione — provato: `GET /rest/v1/User?select=email` ha
restituito l'email di un utente registrato vero. Il 25/08/2026 RLS è stata abilitata su
tutte le tabelle di `public` (prima a mano sul database, poi tracciata nella migration
`prisma/migrations/20260825150000_enable_row_level_security/`): da quel momento la stessa
richiesta restituisce `[]`. **Prisma non è influenzato**: si connette come proprietario
delle tabelle, che bypassa RLS per definizione — ogni lettura/scrittura dell'app continua a
funzionare come prima. L'unica cosa che RLS blocca è l'accesso diretto via API REST con i
ruoli `anon`/`authenticated`.
- **Ogni tabella NUOVA deve abilitare RLS nella stessa migration che la crea.** La migration
  del 25/08 gira una volta sola e NON copre le tabelle create da migration successive (Prisma
  non riesegue mai una migration già applicata). Riga da aggiungere sempre:
  `ALTER TABLE public."NomeTabella" ENABLE ROW LEVEL SECURITY;`
- **Come verificare**: `npm run db:check-rls` (`prisma/check-rls.ts`) elenca ogni tabella di
  `public` priva di RLS. Sola lettura, nessuna guardia anti-produzione necessaria — pensato
  apposta per essere lanciato anche contro la produzione, dopo un deploy che aggiunge tabelle
  o come controllo periodico manuale (non un cron: i 2 disponibili su Vercel Hobby sono già
  occupati da trial-check e gdpr-purge).
- Nessuna policy RLS è stata creata: con RLS attiva e zero policy, ogni riga è già negata a
  chiunque non sia il proprietario — è il comportamento voluto oggi ("nessuno passa dall'API
  REST"). Se in futuro servisse esporre dati via API REST (es. un client Supabase lato
  browser), servirebbero policy esplicite per organizzazione: decisione del fondatore, non
  ancora presa.

## 8. Stato del prodotto (data di verifica riportata riga per riga, non più un unico timbro)

Fino al 2026-09-04 questa sezione si intitolava "Stato verificato al 2026-07-26" ma
conteneva righe datate agosto e settembre — un titolo che prometteva una data unica non
più vera per tutto il contenuto. Da qui in avanti ogni riga porta la propria data.

- `npx tsc --noEmit` → **0 errori** (RIVERIFICATO 2026-09-05, a runtime, in questo
  passaggio).
- `next build` → **134 pagine, non più 137** (RIVERIFICATO 2026-09-05 con `npx next build`,
  non `npm run build`: quest'ultimo esegue anche `prisma migrate deploy` contro il database
  remoto, cosa che questo lavoro doveva evitare — `next build` da solo non tocca il
  database).
- Pagina `/situazione` funzionante con fatti reali — **NON RIVERIFICATO**: richiede una
  sessione autenticata dal vivo in un browser, non disponibile in un lavoro di sola
  verifica documenti. Ultima conferma nota: nel browser, 2026-07-26.
- Chat AI risponde con crediti reali, date e giorni di ritardo corretti — **NON
  RIVERIFICATO**, stesso motivo. Ultima conferma nota: nel browser, 2026-07-26.
- `/api/ai/insights/generate` è ATTIVO (RIVERIFICATO su codice, 2026-09-05, invariato dal
  2026-09-04): consuma crediti (`consumeCredits`, `GENERATION_CREDIT_COST`), rimborsa se il
  modello risponde in un formato non utilizzabile. Non è più uno stub 503 — quel codice
  resta solo come guardia se manca la chiave Anthropic, non come stato permanente.
- Isolamento tra organizzazioni: **nessun IDOR trovato** nell'audit del 2026-07-26 — **NON
  RIVERIFICATO in questo passaggio**: un riaudit completo (IDOR, segreti, SQLi, XSS)
  richiede una revisione dedicata dell'intero codice, fuori dallo scopo di un lavoro sui
  soli documenti. La riga resta come record storico di quell'audit, non come conferma di
  oggi.
- Merge di giornata su `claude/merge-repos-nextjs-rOZU3` il 2026-07-26 (record storico da
  git log, non decade): stub Stripe sync → integrazioni oneste → controllo ruoli →
  contesto AI su dati reali → fuso orario Europe/Rome.

## 9. Debiti noti (elencati, NON risolti)

- "Run now" di un report aggiorna solo `lastRunAt`: nessun PDF generato.
- Condivisione report `share/[token]`: legge da localStorage, non validata lato server.
- **Operations e Mercato hanno motori sintetici** (seno/coseno, array fissi); le voci di
  menu sono già disattivate ma pagine e API restano nel repo.
- Split-brain competitor: scritti su `Competitor`, letti da `Competitor_b7`.
- `AiAlert`/`AiAlertConfig`: popolati dal seed e mai letti dal codice.
- ~14 modelli Prisma morti nello schema.
- `ImportBatch` ha FK verso i modelli zombie `User_b4`/`Organization_b4` — deroga
  documentata in `src/lib/import/batch-fk.ts`.
- **ATTENZIONE**: `Report_b8`, `CustomDashboard_b8`, `NotificationPref_b8` hanno il
  suffisso `_bN` dei modelli morti ma sono **ATTIVI** — non trattarli da zombie.

## 10. Backlog sicurezza (audit 2026-07-26, RIVERIFICATO riga per riga 2026-09-05)

- **npm audit (RIVERIFICATO 2026-09-05, `npm audit`)**: 13 vulnerabilità, non più "10 — 3
  critical" come diceva questa riga fino a oggi — 0 critical, 7 high, 4 moderate, 2 low.
  `next` è ancora nell'elenco (high, ma oggi con fix disponibile — non più "senza fix
  disponibile"). `next-auth`/`@auth` NON compare più nell'elenco. `xlsx` non è più una
  dipendenza del progetto: sostituita da `exceljs` (`^4.4.0`, usata in
  `src/lib/import/parse.ts`, lo stesso percorso di upload file che `xlsx` occupava), che
  oggi compare lei stessa nell'elenco come moderate, fix disponibile ma di versione
  maggiore (da verificare prima di applicarlo, non fatto qui: nessuna modifica a
  package.json in un lavoro sui soli documenti).
- CSP: **esiste** (`next.config.mjs`), ma di default in modalità
  `Content-Security-Policy-Report-Only` — segnala le violazioni, non le blocca. Si passa a
  bloccante impostando `CSP_ENFORCE=true`. Resta da fare: portarla in enforcement dopo un
  periodo pulito in report-only (RIVERIFICATO su codice, 2026-09-05, invariato dal
  2026-09-04).
- ~~Nessun endpoint GDPR export/cancellazione account.~~ **FALSA, risolta 2026-09-05**
  (era già segnata "probabilmente falsa" dal 2026-09-04, ora verificata fino in fondo):
  esistono davvero `src/app/api/gdpr/export/route.ts` e `src/app/api/gdpr/account/route.ts`,
  `User.deletionRequestedAt` e `Organization.deletionRequestedAt` esistono nello schema, e
  il cron `gdpr-purge` esiste (`src/app/api/cron/gdpr-purge/route.ts`) — il flusso GDPR
  descritto al §12 è reale, non solo pianificato.
- ~~Webhook Stripe senza idempotency su event.id.~~ **FALSA, risolta 2026-09-05** (era già
  segnata "sembra superata" dal 2026-09-04, ora verificata fino in fondo): il webhook
  (`src/app/api/webhooks/stripe/route.ts`) chiama davvero `prisma.stripeWebhookEvent.create`
  su `event.id` PRIMA di processare l'evento (rivendica l'idempotenza) e lo cancella se il
  processing fallisce; se la rivendicazione stessa fallisce (event.id già presente) risponde
  500 così Stripe ritenta più tardi invece di processare due volte lo stesso evento.
- `change-password` **non invalida le sessioni JWT** esistenti (RIVERIFICATO 2026-09-05: il
  file aggiorna solo `passwordHash`, nessuna chiamata a `signOut`/revoca sessione).

Corrette il 2026-09-04, RIVERIFICATE 2026-09-05 (salvo dove segnalato):
- Rate-limit: NON è fail-open. 17 dei 20 secchielli in `src/lib/rate-limit.ts` sono
  `onFailure: 'closed'`; restano fail-open solo `report-generate-ip`, `share-token-ip`,
  `exchange-rates-ip` — scelta deliberata su rotte dove bloccare per un disservizio di
  Upstash costerebbe più del rischio di abuso. (Attenzione a contare a mano: il file
  contiene anche la riga `onFailure: FailureMode;` nella definizione del tipo, che non è un
  secchiello — sono 20 secchielli veri, non 21.)
- Audit log: esiste, `src/lib/audit/log.ts`, **33 punti di chiamata oggi, non più 24** (grep
  `auditLog(` su `src/` e `admin/`, esclusa la definizione della funzione — cresciuto nel
  giro di un giorno, probabilmente per lavoro recente che ha aggiunto chiamate; non
  indagato oltre, non era richiesto).
- `/api/ai/analyze` consuma crediti (`consumeCredits`, `ANALYSIS_CREDIT_COST`), come
  `/api/ai/chat` e `/api/ai/insights/generate`.

## 11. Guida modelli ed effort

Nomi dei modelli corretti il 2026-09-05: `claude-fable-5` e `claude-opus-4-8` erano nomi di
una generazione precedente (mancava il patch number del primo, e il secondo nominava
un'altra major version). Sostituiti con `claude-fable-5-1` e `claude-opus-5`, i nomi che
risultano oggi correnti.

| Modello | Effort | Quando |
|---|---|---|
| `claude-fable-5-1` | xhigh | Diagnosi profonde, audit, root-cause |
| `claude-opus-5` | xhigh | Sicurezza, auth, schema Prisma, codice critico |
| `claude-sonnet-5` | high/xhigh | Sviluppo normale: componenti, API, refactor |
| `claude-haiku-4-5` | — | Merge, restart, verifiche meccaniche (va istruito a ESEGUIRE, non descrivere) |

`claude-haiku-4-5` NON è stato toccato: non sono sicuro se il nome corrente richieda un
suffisso di data (nella forma vista altrove `claude-haiku-4-5-20251001`) o se la forma
breve resti valida di per sé in questo contesto — a differenza degli altri tre, per
`claude-haiku-4-5` non ho trovato conferma sufficiente per decidere. Meglio lasciarla
com'è che inventare: segnalato, da decidere.

La parola `ultrathink` nel prompt aumenta il ragionamento per quel turno.

## 12. Pannello admin locale (`admin/`)

**Cos'è**: un piccolo server web separato dall'applicazione, che gira SOLO sul Codespace del
fondatore, per fare dal browser le operazioni che altrimenti richiedono comandi lunghi nel
terminale. Non è una parte del prodotto: i clienti non lo vedono e non esiste online.

> ⚠️ **Accede al database di PRODUZIONE**, lo stesso di anlyra.com, con utenti reali dentro.
> Non ha login: la sua unica protezione è girare solo in locale. Ogni modifica è immediata,
> irreversibile e registrata nell'audit log con azioni `admin.*`.

**Come si avvia** (dal Codespace, in un terminale qualsiasi):

```
npm run admin
```

Dentro il Codespace il server ascolta su tutte le interfacce (serve al proxy di inoltro porte di
GitHub per raggiungerlo — su loopback soltanto il browser otterrebbe un 404); fuori dal Codespace
resta su `127.0.0.1` come prima. L'avvio stampa il link diretto da aprire (calcolato da
`CODESPACE_NAME`), altrimenti apri la scheda **PORTS** di VS Code, trova la porta **3001** e aprila
da lì. Si ferma con Ctrl+C. Se la 3001 è occupata: `ADMIN_PORT=3002 npm run admin`.

> ⚠️ **La porta 3001 deve restare "Private" nella scheda PORTS.** È l'UNICA cosa che la tiene
> raggiungibile solo dal tuo account GitHub: il pannello non ha login, quindi impostarla su
> "Public" la renderebbe raggiungibile da chiunque abbia il link, con accesso pieno e immediato
> al database di produzione. Il controllo sull'header Host in `admin/server.ts` accetta solo
> l'host esatto inoltrato dal tuo Codespace (mai l'intero dominio `*.app.github.dev`, che
> accetterebbe anche porte e Codespace altrui) e il token richiesto su ogni scrittura sono difese
> in più, non un sostituto della privacy della porta.

**Cosa fa**:
- *Vedere*: organizzazioni (con **entrambe** le colonne piano, vedi sotto) e i loro
  membri (email + ruolo, sotto la tabella organizzazioni — VERIFICATO 2026-09-05, prima
  c'era solo un conteggio), utenti, audit log filtrabile, conteggi generali.
- *Modificare*: crediti AI di un'organizzazione, piano, ruolo di un membro (due moduli:
  scheda Utenti per id utente, scheda Organizzazioni per email — stessa azione,
  `setMemberRole`, sotto).
- *Pulire*: cancellare insight con filtri, cancellare singole righe di prova per id,
  sbloccare un account (azzerare la richiesta GDPR, riportare un ruolo a `owner`).
- *Lanciare i cron a mano*: `trial-check` (che include rinnovo crediti e report pianificati) e
  `gdpr-purge`. Chiamano gli endpoint veri dell'app, quindi **serve `npm run dev` attivo sulla 3000**.

**Cosa NON può fare** (per evitare aspettative sbagliate):
- **Non modifica i testi dell'interfaccia**: le scritte stanno in `src/messages/it.json` e
  `en.json`, cioè nel CODICE. Si cambiano modificando quei file e facendo un deploy, mai da qui.
- Non modifica prompt AI, prezzi, piani come definizione, né alcuna logica: quelli sono codice.
- Non crea organizzazioni o utenti (si creano dalla registrazione vera).
- Non cancella un'organizzazione o un utente interi: per quello esiste il flusso GDPR
  (`deletionRequestedAt` + cron `gdpr-purge`), che il pannello può solo **annullare**, non avviare.
- Non manda email (a parte quelle che partono da sole lanciando `trial-check`).

**I due campi "piano" che divergono** (difetto noto, il pannello li mostra entrambi):
- `BillingSubscription.plan` è **quello vero**: lo legge `getBillingState()`, quindi decide
  funzionalità, limiti e quanti crediti dà il rinnovo mensile.
- `Organization.plan` è **legacy** (default `"STARTER"`, che non è nemmeno un piano valido):
  oggi incide solo sul nome/prezzo del piano scritti nelle email di fine prova (`trial-check.ts`).
- Impostando il piano dal pannello vengono aggiornati **entrambi**, così non restano disallineati.

**Perché non può finire in produzione** (tre livelli, dal più forte):
1. `admin/` è in `.vercelignore`: i file non vengono nemmeno caricati su Vercel.
2. Sta fuori da `src/app`, quindi il router di Next non può trasformarlo in una route.
3. `admin/guards.ts` rifiuta l'avvio se manca `ADMIN_PANEL=yes`, se `NODE_ENV=production`
   o se è presente la variabile `VERCEL`.

**Nota per Claude**: `prisma/guard.ts` (la guardia anti-produzione) **non** è usata qui, di
proposito — lavorare sulla produzione è lo scopo del pannello, quindi importarla lo bloccherebbe
sempre. Il modello di protezione è diverso: raggiungibile solo da localhost, avvio esplicito,
ogni scrittura confermata e tracciata.

## 13. Riferimenti

- Stato e valutazione: [`.vscode/STATO-REALE-E-VALUTAZIONE.md`](.vscode/STATO-REALE-E-VALUTAZIONE.md)
- Scoperte non ancora affrontate: [`.vscode/SCOPERTE-DA-VALUTARE.md`](.vscode/SCOPERTE-DA-VALUTARE.md)
- Decision log: [`docs/decisions/`](docs/decisions/)
- Proxy 500 in dev: [`docs/dev-codespace-proxy-500.md`](docs/dev-codespace-proxy-500.md)
- Security checklist storica: [`docs/security-audit-checklist.md`](docs/security-audit-checklist.md)

---

**Versione**: v5.4 · **Aggiornato**: 2026-09-05 · **Audience**: Claude nelle future sessioni Anlyra.
Le versioni precedenti (v4.0 e prima) contenevano informazioni superate — tra cui
SQLite come DB di dev, password demo vecchia, "AI insights operativa" e la procedura
di recovery del Codespace — e non vanno più usate come fonte.
La v5.1 corregge cinque affermazioni false rimaste nella v5.0 (§8, §9, §10 — vedi il
report della sessione che le ha corrette per il dettaglio) e aggiunge
`.vscode/SCOPERTE-DA-VALUTARE.md` come registro delle scoperte non ancora affrontate.
La v5.2 corregge §1 (Identità progetto): la versione di Next.js era sbagliata di due
versioni maggiori (14.2.18 dichiarato, 16.2.12 reale), il dominio online era quello
sbagliato (`anlyra.vercel.app` invece di `anlyra.com`), e la voce sulla password demo
descriveva un accesso nel frattempo disattivato (login via credenziali per `demo@pro.app`
bloccato in questa stessa sessione). Le altre sezioni di CLAUDE.md NON sono state
riverificate in questo passaggio — vedi il rapporto della sessione che ha fatto questa
correzione per l'elenco di quali sezioni sembrano più a rischio.
Cancellato anche il vecchio `Claude.md` (minuscolo, v5.0 del 20 agosto): file distinto da
questo, non da esso stesso, con contenuti superati (SQLite, NextAuth non installato,
cookie `pro_session`, endpoint `/api/auth/login-demo` mai più esistito nel codice) e nulla
nel repository lo referenziava.
La v5.3 riverifica riga per riga §3, §4, §7, §8, §10 (le sezioni segnalate a rischio dalla
v5.2) e corregge ogni timbro VERIFICATO che non corrispondeva più al codice: §3 (11
migration applicate, non 3), §4 ("npm run lint" è `eslint .`, non "next lint"), §7 (
`requireManagerRole` blocca 12 file/13 punti, non 11 — mancava `reports/[id]/share`), §8
(rinominata: portava un'unica data in titolo con contenuto di mesi diversi — ora ogni riga
ha la propria data o "NON RIVERIFICATO" con il motivo), §10 (npm audit oggi conta 13
vulnerabilità/0 critical, non più 10/3 critical, e `xlsx` non è più nemmeno una dipendenza;
le due righe "DA VERIFICARE" sono state risolte: entrambe erano false, GDPR e idempotency
Stripe sono reali; l'audit log ha 33 punti di chiamata, non 24). Corretti anche due nomi di
modello in §11 (`claude-fable-5` → `claude-fable-5-1`, `claude-opus-4-8` → `claude-opus-5`);
`claude-haiku-4-5` lasciato invariato per incertezza dichiarata, non per omissione.
La v5.4 riporta in CLAUDE.md il lavoro funzionale di questa lunga sessione, che le v5.1-v5.3
non coprivano (erano correzioni di affermazioni sbagliate, non racconto di cosa è cambiato).
Aggiunte a §7: fatturazione riservata a `owner` (`requireOwnerRole`, separato da
`requireManagerRole`), chi crea un'organizzazione ora diventa `owner` (non più `admin` — le
organizzazioni create prima vanno corrette a mano dal pannello admin, non c'è modo di
contarle con certezza), `editor`/`viewer` identici oggi, numeri onesti nel motore
finanziario (null invece di zeri finti, filtro di periodo effettivo, finestre a calendario
preciso, confronti a parità di giorni e ore, runway/LTV/abbandono inventati rimossi,
affermazioni false su landing e piani rimosse), la separazione crediti piano/acquistati,
le email di prova che non scrivono più a chi ha pagato con prezzi dal listino vero,
l'escape del testo utente in ogni email, le guardie sull'onboarding. Aggiornato §12 con
l'elenco membri per organizzazione e il modulo di cambio ruolo per email nel pannello
admin. Aggiunta a §2 la regola sui riferimenti a file/riga nei compiti, verificati non
sempre esatti in questa sessione. §5, §6, §9, §13 NON riverificate in questo passaggio
(§12 riverificata solo per le due aggiunte citate, il resto della sezione riportato dalla
v5.3) — vedi il rapporto di questa sessione per il giudizio di rischio sezione per sezione.
