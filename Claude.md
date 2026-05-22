# CLAUDE.md — Anlyra (Business Analyzer)
# File di contesto principale per Claude Code
# Versione 5.0 — Fine fase stabilizzazione + design system parziale. Prodotto stabile e dimostrabile.

---

# REGOLE FONDAMENTALI (LEGGI PRIMA DI TUTTO)

1. **L'utente NON sa programmare**. Fai TUTTO tu in modo autonomo. Non chiedere mai di modificare file a mano. Non dare istruzioni tecniche da eseguire all'utente. Spiega in italiano semplice cosa hai fatto.

2. **Quando dichiari di aver fatto qualcosa, FALLA DAVVERO.** Prima di dire "fatto", verifica:
   - `cat <file_modificato>` per vedere il contenuto reale
   - `git diff` per vedere le modifiche
   - `git log --oneline -3` per confermare il commit sul branch giusto
   Se uno step fallisce, NON dichiarare completato. Risolvi prima.

3. **Dopo OGNI modifica importante**: `git add . && git commit -m "..." && git push`.

4. **Se trovi errori, risolvili tu** senza chiedere conferma all'utente.

5. **Una cosa alla volta**: completa un task, verifica, fai commit, e SOLO DOPO passa al successivo.

6. **Verifica sempre il branch all'inizio**. Ogni nuovo prompt deve iniziare con:
   ```
   git fetch origin --all
   git checkout claude/merge-repos-nextjs-rOZU3
   git pull origin claude/merge-repos-nextjs-rOZU3
   git log --oneline -5
   ```

7. **Rispetta la divisione di ruolo Opus / Haiku / Claude Design** descritta nel paragrafo "WORKFLOW DI SVILUPPO" sotto.

---

# MISSIONE DEL PROGETTO

**Anlyra** è una piattaforma SaaS globale per l'analisi aziendale completa, target PMI, consulenti e startup di qualsiasi settore. **L'utente ha già clienti reali in arrivo**, quindi qualità e affidabilità contano.

## Cosa offre
- Analisi finanziaria (ricavi, costi, margini, cash flow, unit economics)
- Analisi di mercato (competitor, market share, trend, posizionamento)
- Monitoraggio operativo (KPI, efficienza, team, qualità)
- AI integrata (chat, insights, alert proattivi, forecasting, benchmarking)
- Report PDF professionali
- Dashboard drag and drop personalizzate

## Vantaggio competitivo
"AI che analizza senza vedere i tuoi dati bancari sensibili" — posizionamento privacy-first per il mercato europeo.

## Brand personality (da design system)
Sereno (non ansiogeno) · Competente · Premium italiano · Caldo · Privacy-first · IT+EN equiparate.

## Lingue
Italiano + Inglese, multilingua nativa via next-intl con `localePrefix: 'always'`.

---

# WORKFLOW DI SVILUPPO

L'utente lavora con TRE strumenti Claude in parallelo, con ruoli distinti.

## Strumento A — Claude Code esterno (Opus 4.7)
- Collegato direttamente a GitHub `cnayaz/Anlyra`
- Modello più potente, usato per LAVORO PRINCIPALE: nuove pagine, refactoring, fix complessi
- Crea feature branch e fa merge nel principale (lo fa lui durante i blocchi di Haiku)
- NON può eseguire il dev server, NON applica migrazioni Prisma

## Strumento B — Claude Code Codespace (Haiku 4.5)
- Lavora dentro GitHub Codespace, accesso a filesystem e runtime
- Modello più rapido, usato per OPERAZIONI VELOCI: migrate, seed, restart server, controlli HTTP
- A volte si blocca: riavviare Codespace via `github.com/codespaces` (Stop + Restart)

## Strumento C — Claude Design (Opus, web app dedicata)
- Prodotto Anthropic per design system, lanciato aprile 2026
- Memoria persistente del progetto tra chat (Your project and files stay put)
- Limite settimanale di token: dopo saturazione si aspettano 4-7 giorni
- Output: mockup cliccabili in chat + handoff bundle per Claude Code quando design è pronto
- Stato attuale: 5 delle 14 sezioni del Modulo 4 completate (vedi DESIGN SYSTEM sotto)

## Convenzione branch
- **Principale**: `claude/merge-repos-nextjs-rOZU3`
- Feature: `claude/<descrizione-task>` con merge no-ff o ff-only nel principale
- Branch `main`: legacy, NON usare

## Lezioni apprese (ripetere = fallire)

**Lezione 1 — Verifica branch corrente all'inizio di ogni prompt.**
Opus può ritrovarsi su feature branch obsoleto se la chat ha contesto vecchio. Mitigazione: ogni prompt nuovo inizia con il blocco git fetch + checkout + pull + log.

**Lezione 2 — Output finale deve includere git log esplicito.**
Quando un agente dice "merged" senza mostrare git log, può aver mergiato altrove. Richiedere SEMPRE `git log --oneline -5` con conferma del branch corrente.

**Lezione 3 — Migrazioni Prisma e Opus.**
Opus esterno non ha accesso al DB del Codespace. Genera migrazioni con `--create-only`, applicazione spetta a Haiku.

**Lezione 4 — Modelli DB nuovi.**
Usa nomi puliti senza suffisso `_bN` (riservati a modelli legacy).

**Lezione 5 — Logout in app senza NextAuth.**
NextAuth NON è installato in questo progetto. L'app usa cookie `pro_session` custom. Il logout DEVE usare `window.location.href = '/api/auth/logout?locale=${locale}'`, NON `router.push()` (i redirect HTTP da API route non sono seguiti) e NON `signOut()` di next-auth.

**Lezione 6 — getCurrentContext deve allinearsi al DB reale.**
La funzione `src/lib/session.ts` cercava org con slug 'techflow-srl', ma il DB ha slug 'acme' (id 'demo-org'). Ogni chiamata creava un'org fantasma e tutte le query WHERE puntavano a quella vuota. Fix: allineare lo slug al valore reale del DB.

**Lezione 7 — react-grid-layout + webpack 5 + dynamic import.**
react-grid-layout@1.4.4 è CommonJS, webpack 5 in Next.js 14 va in hang quando lo tira dentro `dynamic().then()`. Fix: aggiungere `transpilePackages: ['react-grid-layout', 'react-resizable']` in `next.config.mjs` e usare `export default` invece di named export sui componenti caricati dinamicamente.

---

# STATO ATTUALE DEL PROGETTO (v5.0 snapshot)

**Repository**: cnayaz/Anlyra
**Branch principale**: `claude/merge-repos-nextjs-rOZU3`
**Ultimo commit HEAD**: `8e5c7b3` (merge: i18n tranche 3 final)
**Working directory in Codespace**: `/workspaces/Anlyra` (oppure `/home/user/Anlyra`)

## Cosa è stato fatto in questa sessione di stabilizzazione

### Foundation confermata
- Next.js 14 (App Router) + TypeScript strict + Tailwind + shadcn/ui
- SQLite + Prisma (5 migrazioni applicate)
- next-intl IT + EN
- Theme PANNA chiaro / GRIGIO CALDO scuro applicato a livello variabili CSS

### 12 pagine sviluppate e funzionanti nel browser (test visivo completato)
- Overview `/it`
- Finance: `/finance/{revenue,costs,cashflow,budget}` (4 pagine)
- Market: `/market/{competitors,trends,positioning}` (3 pagine)
- Operations: `/operations/{customers,team,efficiency}` (3 pagine)
- AI: `/ai/{chat,insights,alerts,forecasting,benchmarks,agent}` (6 pagine)
- Data: `/data/{import,manual,history}` (3 pagine)
- Reports: `/reports`, `/reports/builder`, `/reports/scheduled` (3 pagine)
- Custom Dashboards: `/custom-dashboards`, `/custom-dashboards/builder` (2 pagine)
- Integrations: `/integrations` (1 pagina)
- Settings: `/settings/{profile,organization,team,billing,security,notifications}` (6 pagine)
- Auth: `/login` ora funzionante con endpoint `/api/auth/login-demo`

### Bug critici fixati nella sessione
- Logout `signOut` di next-auth → sostituito con `window.location.href` su route handler custom
- Pagina login mancante/non funzionante → creata con bottone demo + endpoint POST
- Server compilation hang su `/[locale]` → fixato con `transpilePackages` per react-grid-layout
- Errore "main.User does not exist" → causato da organizzazione fantasma in getCurrentContext, fixato
- Errore Prisma `insight_b7` foreign key violated → rimossa scrittura zombie in `seedInsights`
- API insights ritornava vuoto → leggeva da tabella zombie `insight_b7` invece di `Insight`, fixato + helper mapping `impactToPriority` / `toneToType`
- API alerts ritornava vuoto → stesso bug org fantasma, fixato
- Pagina login da deslogato dava "impossibile raggiungere" → middleware + redirect callbackUrl con locale
- Tabella `AiAlertConfig` referenziata ma inesistente → migrazione `20260511000000_add_ai_alert_config` aggiunta

### Internazionalizzazione (~104 stringhe spostate)
- Tranche 1 (43 stringhe): overview, operations/team, operations/customers
- Tranche 2 (21 stringhe): market, market/competitors (billing già tradotto)
- Tranche 3 (20 stringhe): market/positioning, operations/efficiency, share
- Login (17 chiavi nuove): namespace login completo
- Auto-fix in topbar: Logo.tsx "Pro" e "Analytics" hardcoded
- Bilancio: TUTTE le pagine principali si traducono completamente IT ↔ EN

### Design System (Moduli 1-3 approvati + parte del Modulo 4)
Lavoro fatto su Claude Design, mantenuto in memoria persistente del suo progetto.

**Modulo 1 — Palette** (approvato):
- Panna chiaro invariato (`--background: 36 47% 96%` / dark `30 6% 10%`)
- Accento brand: **VERDE SALVIA**, 9 stop. sage-500 `#647A57` è la pelle del brand
- Stati semantici "italiani": success oliva 72°, warning ocra 35°, danger terracotta 12°, info blu sereno 210°
- Palette Recharts 8 hue armonici, --chart-1 = brand
- Riparazione `--sidebar*` light/dark (panna scuro + active sage-50)
- Riparazione `tailwind.config.ts` primary/accent (no più navy/teal)

**Modulo 2 — Tipografia** (approvato):
- Inter come unica sans (drop DM Sans)
- JetBrains Mono solo per ID/hash/timestamp
- 3 weight: 400/500/600
- Body 15px (data-dense)
- Tabular nums obbligatori su KPI, tabelle, axis Recharts
- Word-break: keep-all per gestire parole italiane lunghe in sidebar

**Modulo 3 — Spacing, Radius, Elevation** (approvato):
- Spacing Tailwind standard + regole di prossimità
- Due preset densità: AIRY (Overview, Insights, marketing) vs DENSE (History, Reports, Settings)
- Radius 6 step: xs 4 / sm 6 / md 8 / lg 12 / xl 16 / full
- 5 livelli elevation con shadow-color HSL 30 25% 15% (caldo, non blu)

**Modulo 4 — Componenti chiave** (5 di 14 approvate, 9 in attesa):
- Sidebar (240px + collapsed 64px, sage-50 active + indicatore sage-500) — APPROVATA
- Topbar (breadcrumb + crediti + notifiche + lang + tema + avatar dropdown) — APPROVATA
- PageHeader (title + subtitle + 6 badge variants + actions slot + density) — APPROVATA
- KPI Card (sentiment-driven delta + benchmark variant + sparkline + 3 system states) — APPROVATA
- Insight/Alert Card (border-left + icon wrap + spotlight variant + status states) — APPROVATA
- Button variants — IN ATTESA
- Form fields — IN ATTESA
- Tabs — IN ATTESA
- Dialog — IN ATTESA
- Toast — IN ATTESA
- Dense Table — IN ATTESA
- Empty state — IN ATTESA
- Loading skeleton — IN ATTESA
- Error state — IN ATTESA

Claude Design **ha raggiunto il limite settimanale**: rinnovo previsto in 4-7 giorni. Le 5 sezioni completate vivono nella memoria persistente del progetto Claude Design. Quando tornerà, riprendere col Modulo 4 Sezione 6 (Button variants).

### Test visivo finale (confermato dall'utente)
- Pagina login: bottone demo funzionante, rientro nell'app OK
- Insights: 6 card visibili con titoli realistici
- Alerts: 6 card visibili con severità diverse
- Traduzioni: positioning + efficiency tradotti correttamente IT↔EN
- Overview, Finance, Data Import: tutto funzionante
- Sidebar ancora nei colori vecchi (blu/bianco) — atteso, verrà fixato col handoff design system

---

# DEBITI TECNICI NOTI

Lista aggiornata. Da affrontare prima del lancio vero, ma NESSUNO blocca i test attuali.

## Bloccanti per lancio reale

### DEBITO 1 — Sidebar nei colori vecchi (blu/bianco)
La sidebar attuale è ancora con `--sidebar*` blu/bianco. Sarà sostituita applicando il design system (Modulo 4 Sezione 1 — Sidebar approvata) quando Opus riceverà l'handoff bundle da Claude Design.

### DEBITO 2 — Colori hardcoded sparsi
Tabelle Finance e altri componenti hanno classi `bg-white`, `bg-slate-*`, `bg-blue-*` hardcoded che non rispondono al theme. Cleanup via grep + sostituzione con variabili shadcn (`bg-card`, `bg-muted`, `border-border`, ecc.).

### DEBITO 3 — Autenticazione vera mancante (NextAuth)
L'app usa cookie `pro_session` custom con utente demo hardcoded. Per lancio con clienti reali serve NextAuth funzionante con email/Google/Microsoft, password hashate (bcrypt già nel package.json), eventuale 2FA (speakeasy già nel package.json). Endpoint `/api/auth/login-demo` attuale è placeholder.

### DEBITO 4 — Pagine custom-dashboards builder
react-grid-layout funziona ora (fix `transpilePackages`), ma il flusso di creazione/edit dashboard non è stato testato a fondo. Da verificare.

## Da affrontare nelle prossime fasi

### DEBITO 5 — Doppia fonte di verità per crediti AI
Insights/Alerts usano `usePlan()` da `@/lib/billing/context`. Topbar usa `useCreditsStore` (Zustand). Unificare in una sola fonte.

### DEBITO 6 — Tre versioni duplicate della Topbar
`src/components/topbar.tsx` (legacy inutilizzata), `src/components/layout/topbar.tsx` (usata da /market), `src/components/dashboard/Topbar.tsx` (attiva). Consolidare in una sola versione durante l'applicazione del design system.

### DEBITO 7 — Modello DB Alert_b7
Il suffisso `_b7` è convenzione di modelli legacy. Il modello è nuovo ma è stato chiamato erroneamente con quel suffisso. Rinominare in `Alert` semplice con migrazione + aggiornamento query Prisma.

### DEBITO 8 — Schema Insight con 7 campi vs aspettative API
Il modello `Insight` in `prisma/schema.prisma` ha 7 campi (id, organizationId, title, summary, impact, tone, createdAt). Il frontend si aspetta type/priority/status: gestito da helper `impactToPriority` e `toneToType` nell'API. Migration `20260508162711_fix_insight_model` esiste su disco con 6 campi extra ma NON è stata applicata. Da decidere: applicare la migration e semplificare l'API, oppure tenere i mapping helper. Non urgente.

### DEBITO 9 — File DB duplicati nel filesystem
Esistono `./dev.db` (attivo), `./prisma/dev.db` (vuoto), `./prisma/prisma/dev.db` (backup duplicato). Solo `./dev.db` è usato. Cleanup dei due residui per evitare confusione.

### DEBITO 10 — Componenti UI duplicati
Doppia versione di Button, Card, Badge, Skeleton: `ui/Button.tsx` (vecchio, maiuscolo) e `ui/button.tsx` (shadcn minuscolo). Consolidare mantenendo solo la versione shadcn-style. Da fare durante l'handoff del design system.

### DEBITO 11 — Nome organizzazione demo
L'organizzazione demo è "Acme Analytics" (id 'demo-org', slug 'acme'), NON "TechFlow SRL" come scritto nei CLAUDE.md fino alla v4. Adesso allineato a partire dalla v5.

## Documentazione

### DEBITO 12 — DESIGN_SYSTEM.md nel repo
Quando Claude Design completerà il Modulo 4, produrrà un handoff bundle. A quel punto va salvato come `DESIGN_SYSTEM.md` nel repo per essere leggibile da Opus durante l'applicazione al codice.

---

# STACK TECNOLOGICO

## Frontend
- Next.js 14 App Router + TypeScript strict
- Tailwind CSS + shadcn/ui
- Recharts + react-grid-layout (transpilePackages per webpack)
- React Hook Form + Zod
- Zustand + TanStack Query
- next-intl (localePrefix: 'always')
- Framer Motion
- @react-pdf/renderer
- lucide-react (icone)
- Sonner (toast)
- PapaParse (CSV) + SheetJS (Excel)

## Backend
- Next.js Route Handlers
- SQLite + Prisma (modelli zombie da non rimuovere)
- Auth: cookie `pro_session` custom (NextAuth predisposto ma NON installato — vedi DEBITO 3)
- Anthropic SDK (predisposto, modello `claude-sonnet-4-20250514`, non usato finché l'utente non avrà crediti)
- Stripe (predisposto)
- Resend (predisposto)

## Deploy futuro
- Vercel + Supabase

---

# SCHEMA DATABASE — sintetico

## Modelli ATTIVI
- `User`, `Organization` (slug 'acme', id 'demo-org'), `Membership`
- Finanza: `FinancialRecord`, `Transaction`, `CashflowEntry`, `BudgetEntry`, `Subscription`, `Revenue`, `Cost`
- Mercato: `Competitor`, `CustomerStat`
- Operativo: `KPI` (mappato a `KPI_b7`), `Kpi` legacy
- AI: `AIConversation`, `AIMessage`, `Insight` (7 campi: id, organizationId, title, summary, impact, tone, createdAt), `Alert_b7` (severity, status, source, recommendation)
- Import: `ImportBatch`, `Integration`, `SyncLog`
- Nuovi: `AiAlert`, `AiAlertConfig` (migration `20260511000000_add_ai_alert_config`)

## Modelli ZOMBIE (NON USARE, NON RIMUOVERE)
`User_b4`, `Organization_b4`, `User_b5`, `Organization_b5`, `MarketProfile`, `Competitor_b5`, `MarketTrend`, `SwotItem`, `User_b7`, `Organization_b7`, `FinancialData`, `Competitor_b7`, `Insight_b7`, `Organization_b12`

## Migrazioni applicate
1. `20260505204455_init`
2. `20260508162711_fix_insight_model` (aggiunge 6 campi a Insight — NON applicata, vedi DEBITO 8)
3. `20260509181914_add_import_batch_relations`
4. `20260509192410_add_reports_dashboards_notifications`
5. `20260511000000_add_ai_alert_config`
6. `20260512000000_realign_insight_schema` (no-op, mark-as-applied)

---

# DATI DEMO (Acme Analytics)

- Organization: id 'demo-org', slug 'acme', name 'Acme Analytics'
- Definita in `src/lib/demo/data.ts`
- Utente demo: User con sessione cookie `pro_session` (DEMO_SESSION JSON)
- 922 FinancialRecord (~18 mesi storia)
- 3 Competitor demo
- 6 Insight (Tasso abbandono, Margine sopra media, Focus Mid-Market, Aumenta prezzo Pro, Burn rate, Espansione DACH)
- 6 Alert (1 CRITICAL, 2 HIGH, 2 MEDIUM, 1 LOW)
- KPI: churn 4.5%, NPS 42, conversion 2.8%
- `getCurrentContext()` in `src/lib/session.ts` usa slug 'acme' per allinearsi al DB reale

---

# STRUTTURA CARTELLE (sintetica)

```
src/
  app/
    [locale]/
      (auth)/login/page.tsx              ← funzionante
      (dashboard)/
        layout.tsx                       ← Sidebar + Topbar
        page.tsx                         ← Overview
        finance/{revenue,costs,cashflow,budget}/
        market/{competitors,trends,positioning}/
        operations/{customers,team,efficiency}/
        ai/{chat,insights,alerts,forecasting,benchmarks,agent}/
        data/{import,manual,history}/
        reports/{,builder,scheduled}/
        custom-dashboards/{,builder}/
        integrations/
        settings/{profile,organization,team,billing,security,notifications}/
    api/
      auth/login-demo/route.ts           ← creato in v5
      auth/logout/route.ts               ← creato in v5
      ai/{insights,chat,alerts,forecasting,benchmarks}/
      data/import/{preview,commit,batches}/
      data/manual/
      analysis/{financial,market,operations}/
  components/
    ui/                                  ← shadcn-style
    layout/sidebar.tsx                   ← DEBITO 1: ancora vecchio
    dashboard/Topbar.tsx                 ← attivo
    dashboard/UserMenu.tsx               ← logout fixato
    ai/{insights,alerts,forecasting,benchmarks}/...
    data/{import,manual,history}-*.tsx
  lib/
    prisma.ts
    api.ts + api/fetcher.ts
    auth/session.ts                      ← getCurrentContext fixed
    billing/context.tsx                  ← usePlan()
    demo/data.ts                         ← Acme Analytics
    forecasting.ts, benchmarks-data.ts, import-targets.ts
  messages/
    it.json, en.json                     ← ~104 chiavi nuove dopo i18n
prisma/
  schema.prisma
  migrations/ (6 files)
  seed.ts, seed-insights.ts, seed-alerts.ts
```

---

# PATTERN DI UNA PAGINA REALE

Riferimento: `/ai/insights`, `/ai/alerts`. Schema obbligatorio:

```tsx
'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/fetcher';
import { usePlan } from '@/lib/billing/context';

export default function NomePage() {
  const t = useTranslations('nome');
  const { aiCreditsBalance } = usePlan();
  const qc = useQueryClient();
  // 1. State filtri / dialog
  // 2. useQuery con queryKey includente i filtri
  // 3. useMutation con optimistic update + invalidateQueries
  // 4. Layout: header → toolbar → griglia → dialog
  // 5. Stati: loading skeleton, empty, error con Riprova
  // 6. Tutti i testi via t('chiave'), MAI hardcoded
  // 7. Solo classi tailwind con variabili shadcn (bg-card, text-foreground, ecc.)
}
```

---

# REGOLE DI CODICE

- TypeScript strict mode sempre
- Function components + hooks
- Tutti i testi UI via `useTranslations('sezione')`. MAI hardcoded.
- Stringhe nuove vanno in `messages/it.json` E `messages/en.json` (entrambe)
- Crediti AI: oggi due fonti (usePlan + useCreditsStore), DEBITO 5 da unificare
- Solo classi tailwind con variabili shadcn (`bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`). EVITA hardcoded colors
- Loading skeleton + Empty + Error in OGNI pagina
- TanStack Query (queryKey includente i filtri) per data fetching
- Optimistic update sulle mutation di stato
- Zod per validazione form e API
- File naming: PascalCase componenti, kebab-case pagine
- Commit message in inglese: `feat(area): description` o `fix(area): description`
- Logout: SEMPRE `window.location.href`, mai `router.push` o `signOut`

---

# COMANDI UTILI

## Setup iniziale ad ogni prompt
```bash
git fetch origin --all
git checkout claude/merge-repos-nextjs-rOZU3
git pull origin claude/merge-repos-nextjs-rOZU3
git log --oneline -5
git status
```

## Restart server pulito (Haiku Codespace)
```bash
pkill -f "next dev" || true
sleep 3
rm -rf .next
nohup npm run dev > /tmp/dev.log 2>&1 &
sleep 20
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/it
```

## Database operations
```bash
DATABASE_URL=file:./dev.db npx prisma generate
DATABASE_URL=file:./dev.db npx prisma migrate status
DATABASE_URL=file:./dev.db npx prisma migrate deploy
DATABASE_URL=file:./dev.db npx tsx prisma/seed.ts
DATABASE_URL=file:./dev.db npx tsx prisma/seed-insights.ts
DATABASE_URL=file:./dev.db npx tsx prisma/seed-alerts.ts
sqlite3 dev.db ".tables"
sqlite3 dev.db "SELECT id, name, slug FROM Organization;"
```

## Git workflow merge (Haiku Codespace dopo Opus)
```bash
git fetch origin
git checkout claude/merge-repos-nextjs-rOZU3
git pull origin claude/merge-repos-nextjs-rOZU3
git merge origin/<feature-branch> --no-ff -m "merge: description"
git push origin claude/merge-repos-nextjs-rOZU3
```

## Cleanup totale (se nulla funziona)
```bash
rm -rf .next node_modules/.cache
npx prisma generate
npm run dev
```

---

# CHECKLIST PRIMA DI DICHIARARE "FATTO"

1. `cat <file_modificato>` → contenuto davvero cambiato?
2. `npx tsc --noEmit` → compila senza errori NUOVI?
3. `git status` → file modificati visibili?
4. `git diff` → modifiche giuste?
5. `git add . && git commit -m "..." && git push` → fatto?
6. `git log --oneline -5` → commit sul branch GIUSTO?
7. Branch corrente è `claude/merge-repos-nextjs-rOZU3` o feature branch da mergiare lì? Conferma esplicitamente.
8. (Solo Haiku) `curl http://localhost:3000/<rotta>` torna 200?

Se uno step fallisce, RISOLVI prima.

---

# PROSSIMI STEP — ROADMAP DOPO v5

## FASE A — Design System Completion (quando Claude Design rinnova limiti, 4-7 giorni)
Concludere Modulo 4: Button variants, Form fields, Tabs, Dialog, Toast, Dense Table, Empty/Loading/Error state (9 sezioni rimaste).
Output: handoff bundle pronto per Claude Code.

## FASE B — Design System Application (Opus, dopo handoff)
Applicazione del design system al codebase:
- Sostituire `--sidebar*` con i nuovi token (chiude DEBITO 1)
- Sostituire `tailwind.config.ts` primary/accent con sage + ocra
- Aggiungere CSS variables elevation calde
- Sostituire colori hardcoded sparsi (chiude DEBITO 2)
- Consolidare componenti duplicati (chiude DEBITO 10)
- Consolidare le 3 versioni Topbar (chiude DEBITO 6)
- Applicare Sidebar/Topbar/PageHeader/KPI Card/Insight Card nuovi

## FASE C — Cleanup tecnico
- Rinomina `Alert_b7` → `Alert` (chiude DEBITO 7)
- Decidere su migration `fix_insight_model` (DEBITO 8)
- Cleanup file DB duplicati (DEBITO 9)
- Unificare fonte crediti AI (DEBITO 5)

## FASE D — Autenticazione vera (DEBITO 3)
Installare e configurare NextAuth con email + Google + Microsoft. bcrypt per password. 2FA opzionale via speakeasy. Migrare cookie `pro_session` a session NextAuth.

## FASE E — Lancio
- Landing page pubblica `/`
- Pricing page `/pricing`
- Pagine legali (privacy GDPR, terms, cookies)
- Onboarding wizard 5 step
- SEO + meta tags
- Stripe billing reale (sostituire placeholder)
- Resend email reale

---

# TASK ATTUALE: ATTESA + (OPZIONALE) FASE C CLEANUP

Stato: prodotto stabile e dimostrabile. Tutti i bug critici fixati. Design system in stand-by per limite Claude Design.

Mentre si aspetta il rinnovo di Claude Design (4-7 giorni), task opzionali a basso rischio che Opus può fare:

1. **DEBITO 9 — Cleanup file DB duplicati** (15 minuti)
   Rimuovere `./prisma/dev.db` (vuoto) e `./prisma/prisma/dev.db` (backup). Mantenere SOLO `./dev.db`.

2. **DEBITO 5 — Unificare fonte crediti AI** (30 minuti)
   Scegliere `usePlan()` come unica fonte, deprecare `useCreditsStore` o farlo derivare da usePlan.

3. **DEBITO 7 — Rinomina Alert_b7 → Alert** (1 ora con migration)
   Migration Prisma `RENAME TABLE Alert_b7 TO Alert`, aggiornare schema, aggiornare tutte le query, regenerare client. Haiku applica.

4. **Documentazione pubblica `README.md`** (45 minuti)
   Per quando arriveranno developer esterni: setup, stack, comandi base, link a CLAUDE.md.

Da affrontare uno per volta nei prossimi giorni, in ordine di rischio crescente. Nessuno blocca i test attuali.

---

# Note finali di sessione v5.0

L'utente ha completato in una giornata:
- Theme panna applicato
- 12 pagine sviluppate
- 8+ bug critici fixati (logout, server hang, prisma zombie, org fantasma, login, ecc.)
- ~104 stringhe tradotte (i18n IT/EN completo)
- 5 sezioni di design system approvate

Il prodotto è **dimostrabile a clienti reali in modalità demo**. Non è pronto per produzione (manca auth vera, design system in atto, qualche debito tecnico), ma è pronto per essere mostrato come MVP funzionante.
