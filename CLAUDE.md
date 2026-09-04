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

- **Branch principale di sviluppo**: `claude/merge-repos-nextjs-rOZU3` (HEAD al 2026-07-26: `09ac337`).
- **Stack** (VERIFICATO su `package.json`): Next.js 14.2.18 (App Router, `src/`), next-intl
  (IT primaria, EN secondaria), Prisma 5.22, NextAuth v5 beta (JWT), Anthropic SDK,
  Stripe, Resend, Upstash rate-limit, Tailwind + shadcn.
- **Online**: deploy Vercel su `anlyra.vercel.app` (riportato in STATO-REALE §10 del 2026-07-03 — DA VERIFICARE a runtime prima di dichiararlo funzionante in un report).
- **Demo org**: "Acme Analytics" (id: `demo-org`). Password demo: cambiata il 2026-07-01
  in `NuovaDemo2026!` per `demo@pro.app` (fonte: STATO-REALE §9 — DA VERIFICARE al login).
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

**DATABASE (VERIFICATO 2026-07-26)**: **Supabase PostgreSQL**, NON più SQLite.
- `prisma/schema.prisma`: `provider = "postgresql"`, `url = env("DATABASE_URL")`,
  `directUrl = env("DIRECT_URL")` (pooler eu-west-1).
- 3 migration applicate: `20260702225830_init_postgres`, `20260710231614_billing_tables`,
  `20260712142054_repoint_integration_fk_drop_org_b12`.
- **`npm run build` esegue `prisma migrate deploy` PRIMA della build**: ogni build tocca
  il database remoto. Pensarci prima di lanciare build "di prova".
  **`build` NON è coperto dalla guardia** (vedi riquadro in cima), per scelta:
  `migrate deploy` applica solo le migrazioni mancanti in avanti — non cancella dati e non
  azzera lo schema, al contrario di `migrate dev`/`migrate reset` — e Vercel deve poterlo
  fare a ogni deploy. Guardarlo avrebbe costretto a tenere `ALLOW_PROD_DB_WRITE=yes`
  impostata **in permanenza** su Vercel, e una volta lì quella variabile avrebbe disarmato
  la protezione anche per tutto il resto. La guardia copre solo i comandi distruttivi
  lanciati **a mano**.
- **Comandi distruttivi guardati** (VERIFICATO 2026-08-11): i 4 seed
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

**Env file**: sono due, `.env` e `.env.local`, con priorità a `.env.local`. Considerarli
entrambi quando si cerca la sorgente di una variabile. **MAI committare `.env`**.
**MAI impostare `AUTH_URL`/`NEXTAUTH_URL` in sviluppo** (self-proxy loop → 500 dopo 30s,
vedi `docs/dev-codespace-proxy-500.md`).

**Server dev**: gestore UNICO, il terminale col loop di auto-riavvio nel Codespace.
MAI `npm run dev` diretto. Per riavviare: `pkill -f "next dev"` e attendere ~20s.

## 4. Comandi utili (VERIFICATI su package.json)

```
npm run typecheck      # tsc --noEmit
npm run lint           # next lint
npm run build          # ATTENZIONE: prisma migrate deploy + next build (tocca il DB remoto)
npm run db:seed        # tsx prisma/seed.ts
npm run db:generate    # prisma generate (anche in postinstall)
npm run prisma:migrate # prisma migrate dev
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

**Ruoli** (VERIFICATO): valori reali lowercase `'owner' | 'admin' | 'editor' | 'viewer'`
su `Membership.role`. Decisione del fondatore: **cancellare dati e cambiare impostazioni
org = solo owner/admin; leggere e creare/modificare dati = tutti i membri.**
- `requireManagerRole` è applicato a 11 route (VERIFICATO con grep): le 6 DELETE
  (receivables, recurring-expenses, reports, custom-dashboards, data/import/batches,
  market/competitors), PATCH `settings/organization`, e le 4 route integrazioni
  (connect, disconnect, sync, frequency).
- **Ogni nuova azione distruttiva DEVE usare `requireManagerRole`.**
- Nota onesta: il blocco per un utente `viewer` è attivo nel codice ma **NON è ancora
  stato provato dal vivo** (DA VERIFICARE); verificato invece a runtime che un `owner`
  può ancora cancellare.
- Nello schema `Membership.role` ha `@default("owner")` — da cambiare in `'viewer'`
  (default sicuro) quando si costruirà la gestione team.

**Niente dati finti al modello o nel DB** (VERIFICATO):
- La finta sync Stripe è neutralizzata: `src/lib/sync/providers/stripe.ts` delega a
  `makeStubProvider` (prima scriveva record CASUALI in FinancialRecord).
  **Non reintrodurre generatori di dati finti.**
- `/api/integrations/[provider]/connect` ritorna 503 "Integration not available yet":
  non salva chiavi, non marca CONNECTED, non forza il piano PRO. UI: provider "in arrivo".
- Il contesto AI (`ai-context.ts` + i 5 prompt-builder) non passa più KPI né competitor
  hardcoded dal seed (churn 4.2, NPS 42, Alpha/Beta/Gamma): passa i fatti di
  `getFinancialFacts`, il riepilogo scadenzario e le spese ricorrenti.
  **REGOLA: mai passare al modello dati sintetici o hardcoded.**

**Fuso orario** (VERIFICATO): le date sono salvate in UTC come mezzanotte ITALIANA —
`toISOString().slice(0,10)` restituisce il giorno SBAGLIATO. Usare SEMPRE gli helper di
`src/lib/timezone.ts` (`toAppDateString`, `appDateStartUTC`) per date visibili all'utente
o passate all'AI; i giorni di ritardo si calcolano solo con `daysOverdueOf`.

**Row Level Security (RLS) su Supabase** (VERIFICATO 2026-08-25): oltre a servire l'app via
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

## 8. Stato verificato al 2026-07-26

- `npx tsc --noEmit` → **0 errori** (VERIFICATO a runtime).
- `npm run build` → **OK, 137 pagine** (VERIFICATO a runtime).
- Pagina `/situazione` funzionante con fatti reali (VERIFICATO nel browser).
- Chat AI risponde con crediti reali, date e giorni di ritardo corretti (VERIFICATO nel browser).
- `/api/ai/insights/generate` è ATTIVO (VERIFICATO su codice, 2026-09-04): riattivato il
  2026-08-21 (commento nel file), consuma crediti (`consumeCredits`, `GENERATION_CREDIT_COST`),
  rimborsa se il modello risponde in un formato non utilizzabile. Non è più uno stub 503 —
  quel codice resta solo come guardia se manca la chiave Anthropic, non come stato permanente.
- Isolamento tra organizzazioni: **nessun IDOR trovato** nell'audit del 2026-07-26;
  nessun segreto hardcoded, nessun `.env` committato, no SQLi, no XSS (VERIFICATO in audit).
- Merge di giornata su `claude/merge-repos-nextjs-rOZU3` (VERIFICATI con git log):
  stub Stripe sync → integrazioni oneste → controllo ruoli → contesto AI su dati reali →
  fuso orario Europe/Rome.

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

## 10. Backlog sicurezza (audit 2026-07-26, aggiornato 2026-09-04)

- **10 vulnerabilità npm** — 3 critical: `next`, `next-auth`/`@auth`, `xlsx` (senza fix
  disponibile; `xlsx` è sul percorso di upload file).
- CSP: **esiste** (`next.config.mjs`), ma di default in modalità
  `Content-Security-Policy-Report-Only` — segnala le violazioni, non le blocca. Si passa a
  bloccante impostando `CSP_ENFORCE=true`. Resta da fare: portarla in enforcement dopo un
  periodo pulito in report-only (VERIFICATO su codice, 2026-09-04).
- Nessun endpoint **GDPR** export/cancellazione account.
  **DA VERIFICARE — questa riga è probabilmente falsa**: esistono
  `src/app/api/gdpr/export/` e `src/app/api/gdpr/account/`, e §12 di questo stesso file
  descrive un flusso GDPR con `deletionRequestedAt` e il cron `gdpr-purge`. Non l'ho corretta
  perché non era fra i cinque punti di questo lavoro — vedi
  `.vscode/SCOPERTE-DA-VALUTARE.md`.
- Webhook Stripe senza **idempotency** su `event.id`.
  **DA VERIFICARE — anche questa sembra superata**: esiste la migration
  `20260822200000_stripe_webhook_idempotency` e una tabella `StripeWebhookEvent` dedicata.
  Non l'ho corretta per lo stesso motivo della riga sopra.
- `change-password` **non invalida le sessioni JWT** esistenti.

Corrette il 2026-09-04 (erano false, VERIFICATO su codice — le altre righe di questa
sezione NON sono state riverificate in questo passaggio, vedi le due note sopra):
- Rate-limit: NON è fail-open. 17 dei 20 secchielli in `src/lib/rate-limit.ts` sono
  `onFailure: 'closed'`; restano fail-open solo `report-generate-ip`, `share-token-ip`,
  `exchange-rates-ip` — scelta deliberata su rotte dove bloccare per un disservizio di
  Upstash costerebbe più del rischio di abuso.
- Audit log: esiste, `src/lib/audit/log.ts`, 24 punti di chiamata (grep `auditLog(` su
  `src/` e `admin/`).
- `/api/ai/analyze` consuma crediti (`consumeCredits`, `ANALYSIS_CREDIT_COST`), come
  `/api/ai/chat` e `/api/ai/insights/generate`.

## 11. Guida modelli ed effort

| Modello | Effort | Quando |
|---|---|---|
| `claude-fable-5` | xhigh | Diagnosi profonde, audit, root-cause |
| `claude-opus-4-8` | xhigh | Sicurezza, auth, schema Prisma, codice critico |
| `claude-sonnet-5` | high/xhigh | Sviluppo normale: componenti, API, refactor |
| `claude-haiku-4-5` | — | Merge, restart, verifiche meccaniche (va istruito a ESEGUIRE, non descrivere) |

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
- *Vedere*: organizzazioni (con **entrambe** le colonne piano, vedi sotto), utenti, audit log
  filtrabile, conteggi generali.
- *Modificare*: crediti AI di un'organizzazione, piano, ruolo di un membro.
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

**Versione**: v5.1 · **Aggiornato**: 2026-09-04 · **Audience**: Claude nelle future sessioni Anlyra.
Le versioni precedenti (v4.0 e prima) contenevano informazioni superate — tra cui
SQLite come DB di dev, password demo vecchia, "AI insights operativa" e la procedura
di recovery del Codespace — e non vanno più usate come fonte.
La v5.1 corregge cinque affermazioni false rimaste nella v5.0 (§8, §9, §10 — vedi il
report della sessione che le ha corrette per il dettaglio) e aggiunge
`.vscode/SCOPERTE-DA-VALUTARE.md` come registro delle scoperte non ancora affrontate.
