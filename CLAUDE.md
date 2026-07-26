# CLAUDE.md — Guida operativa per sessioni di sviluppo Anlyra

> Contesto operativo per le future sessioni Claude Code. Versione **v5.0** (2026-07-26).
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

Il fondatore (cnayaz) **non è tecnico**. Regole di collaborazione:

- Claude fa tutto il lavoro tecnico e spiega in **italiano semplice**.
- Comandi da eseguire: **UNA riga, uno alla volta**. Niente `!` nei one-liner bash
  (history expansion li rompe).
- Un consiglio è un consiglio, non un ordine: **decide il fondatore**. Nessuna sessione
  riscrive il piano perché le sembra giusto.
- **Un mattone alla volta**: una modifica, provata, mergiata, verificata sul server.
- Quando dici "fatto", **PROVALO**: `git log` del commit atteso, `cat` del file, output
  reale dei comandi. Mai spuntare una casella senza output.
- La prova che un dato persiste è una **rilettura dal DB**, mai l'UI ottimistica.
- Prima di un fix sui dati, verificare **quali colonne il codice legge davvero**
  (caso storico `tone`/`impact`: il codice leggeva colonne diverse dal previsto).
- Riportare sempre il nome REALE del branch pushato, e dichiarare l'ambiente
  (container remoto vs Codespace) a inizio report.

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

## 8. Stato verificato al 2026-07-26

- `npx tsc --noEmit` → **0 errori** (VERIFICATO a runtime).
- `npm run build` → **OK, 137 pagine** (VERIFICATO a runtime).
- Pagina `/situazione` funzionante con fatti reali (VERIFICATO nel browser).
- Chat AI risponde con crediti reali, date e giorni di ritardo corretti (VERIFICATO nel browser).
- Isolamento tra organizzazioni: **nessun IDOR trovato** nell'audit del 2026-07-26;
  nessun segreto hardcoded, nessun `.env` committato, no SQLi, no XSS (VERIFICATO in audit).
- Merge di giornata su `claude/merge-repos-nextjs-rOZU3` (VERIFICATI con git log):
  stub Stripe sync → integrazioni oneste → controllo ruoli → contesto AI su dati reali →
  fuso orario Europe/Rome.

## 9. Debiti noti (elencati, NON risolti)

- "Run now" di un report aggiorna solo `lastRunAt`: nessun PDF generato.
- Condivisione report `share/[token]`: legge da localStorage, non validata lato server.
- `/api/ai/insights/generate` è uno stub 503 (bottone già rimosso dalla UI).
- **Operations e Mercato hanno motori sintetici** (seno/coseno, array fissi); le voci di
  menu sono già disattivate ma pagine e API restano nel repo.
- Split-brain competitor: scritti su `Competitor`, letti da `Competitor_b7`.
- `AiAlert`/`AiAlertConfig`: popolati dal seed e mai letti dal codice.
- ~14 modelli Prisma morti nello schema.
- `ImportBatch` ha FK verso i modelli zombie `User_b4`/`Organization_b4` — deroga
  documentata in `src/lib/import/batch-fk.ts`.
- **ATTENZIONE**: `Report_b8`, `CustomDashboard_b8`, `NotificationPref_b8` hanno il
  suffisso `_bN` dei modelli morti ma sono **ATTIVI** — non trattarli da zombie.

## 10. Backlog sicurezza (audit 2026-07-26, non ancora risolto)

- Rate-limit **fail-open** se manca Upstash (oggi Upstash è configurato).
- **10 vulnerabilità npm** — 3 critical: `next`, `next-auth`/`@auth`, `xlsx` (senza fix
  disponibile; `xlsx` è sul percorso di upload file).
- Manca una **CSP**.
- Nessun **audit log** delle azioni.
- Nessun endpoint **GDPR** export/cancellazione account.
- Webhook Stripe senza **idempotency** su `event.id`.
- `/api/ai/analyze` **non consuma crediti**.
- `change-password` **non invalida le sessioni JWT** esistenti.

## 11. Guida modelli ed effort

| Modello | Effort | Quando |
|---|---|---|
| `claude-fable-5` | xhigh | Diagnosi profonde, audit, root-cause |
| `claude-opus-4-8` | xhigh | Sicurezza, auth, schema Prisma, codice critico |
| `claude-sonnet-5` | high/xhigh | Sviluppo normale: componenti, API, refactor |
| `claude-haiku-4-5` | — | Merge, restart, verifiche meccaniche (va istruito a ESEGUIRE, non descrivere) |

La parola `ultrathink` nel prompt aumenta il ragionamento per quel turno.

## 12. Riferimenti

- Stato e valutazione: [`.vscode/STATO-REALE-E-VALUTAZIONE.md`](.vscode/STATO-REALE-E-VALUTAZIONE.md)
- Decision log: [`docs/decisions/`](docs/decisions/)
- Proxy 500 in dev: [`docs/dev-codespace-proxy-500.md`](docs/dev-codespace-proxy-500.md)
- Security checklist storica: [`docs/security-audit-checklist.md`](docs/security-audit-checklist.md)

---

**Versione**: v5.0 · **Aggiornato**: 2026-07-26 · **Audience**: Claude nelle future sessioni Anlyra.
Le versioni precedenti (v4.0 e prima) contenevano informazioni superate — tra cui
SQLite come DB di dev, password demo vecchia, "AI insights operativa" e la procedura
di recovery del Codespace — e non vanno più usate come fonte.
