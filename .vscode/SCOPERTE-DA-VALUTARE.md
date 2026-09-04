# Scoperte da valutare

Elenco delle cose notate durante i lavori su Anlyra e non ancora affrontate. Non è un
elenco di bug da correggere subito: è la lista da cui ogni sessione nuova dovrebbe
partire, per non riscoprire da capo cose già viste. Ogni voce ha file e riga verificati
sul codice alla data indicata; se una voce smette di essere vera, va aggiornata sul posto
(non cancellata), così la storia resta leggibile. Vedi anche CLAUDE.md §9 e §10 per i
debiti già classificati come tali.

## Crediti

- **Nessun cliente può comprare un pacchetto di crediti, oggi.** Il componente che un
  tempo mostrava il bottone "Compra altri crediti"
  (`src/components/credits-badge.tsx`) è stato RIMOSSO dal repository come codice morto
  (commit `93243ad`, "chore(cleanup): remove dead files, lot 2 group I") — non esisteva
  nessun punto che lo importasse. Il componente REALMENTE mostrato oggi in alto a destra
  è `src/components/dashboard/CreditsCounter.tsx` (importato da
  `src/components/dashboard/Topbar.tsx:37`): un contatore, senza nessun bottone d'acquisto.
  La chiave di traduzione `buyMore` resta ancora in `src/messages/it.json` e
  `en.json`, orfana. Il problema di fondo (nessuna via dall'interfaccia verso l'acquisto)
  resta quindi vero, solo che il file citato in una nota precedente non esiste più.
  (VERIFICATO su codice, 2026-09-04.)
- Perché servirebbe comunque un passaggio su Vercel prima che l'acquisto funzioni: la
  route `src/app/api/billing/credits/checkout/route.ts` legge
  `STRIPE_PRICE_CREDITS_50`, `STRIPE_PRICE_CREDITS_200`, `STRIPE_PRICE_CREDITS_500`
  (`src/lib/stripe/prices.ts:27-29`) e senza quelle variabili risponde 500 "Credit pack
  price not configured". (VERIFICATO su codice, 2026-09-04.)
- `CreditEntry.reason` (`prisma/schema.prisma`, commento a fianco del campo in
  `src/lib/billing/repository.ts:32`) prevede quattro causali —
  `monthly_grant | purchase | ai_call | refund` — ma l'unico punto che scrive righe
  (`src/lib/billing/repository.ts:215`, dentro `applyCreditPurchase`) scrive sempre e
  solo `"purchase"` (riga 219). I CONSUMI di crediti non vengono registrati da nessuna
  parte: non esiste modo di ricostruire, per un'organizzazione con un saldo misto
  piano/acquistati, quanto di quel saldo sia già stato speso da quale colonna.
  (VERIFICATO su codice, 2026-09-04 — grep di `creditEntry.create` su tutto `src/`: un
  solo risultato.)

## Crediti — cancelli che non corrispondono al costo reale

- La pagina Previsioni blocca il pulsante di generazione sotto i 5 crediti
  (`aiCreditsBalance >= 5` in
  `src/app/[locale]/(dashboard)/ai/forecasting/page.tsx:43`), ma la route che chiama,
  `src/app/api/ai/forecasting/route.ts`, non contiene nessun riferimento a crediti: non
  ne consuma nessuno. È un cancello a pagamento su una funzione gratuita.
  (VERIFICATO su codice, 2026-09-04.)

## Codice morto

- `getMonthlyUsage()` in `src/lib/billing/repository.ts:236` è un segnaposto dichiarato
  tale nel suo stesso commento ("Placeholder; in real app reads from imports / ai_calls /
  users / dashboards tables") e restituisce sempre `aiCredits: 0`. Non ha più nemmeno un
  chiamante nel repository (grep `getMonthlyUsage` su `src/` e `admin/`: solo la
  definizione). (VERIFICATO su codice, 2026-09-04.)
- `getCredits()` in `src/lib/credits.ts` non ha nessun chiamante (grep `getCredits(` su
  `src/`, escludendo il file stesso: zero risultati). (VERIFICATO su codice, 2026-09-04.)
- `Organization.aiCreditsBalance` (`prisma/schema.prisma`, riga 83) è una colonna morta:
  nessuna query Prisma la legge o la scrive. Attenzione a non confonderla con la
  variabile locale `aiCreditsBalance` usata in alcuni componenti client (forecasting,
  alerts, insights) — quella legge lo store del browser, non questa colonna; il nome
  uguale è una coincidenza che vale la pena notare, non un collegamento reale.
  (VERIFICATO su codice, 2026-09-04.)

## Piani

- `Organization.plan` (`prisma/schema.prisma`, riga 52) ha `@default("STARTER")`, che
  non è un piano valido in nessuna delle due tabelle piani del codice (vedi voce sotto).
  Il rinnovo mensile crediti (`src/lib/cron/credit-renewal.ts`) salta silenziosamente le
  organizzazioni con un piano sconosciuto, con un `console.warn`, senza toccarne il
  saldo. (VERIFICATO su codice, 2026-09-04 — già noto anche a CLAUDE.md §12.)
- Esistono DUE tabelle piani parallele e in disaccordo tra loro:
  `src/lib/billing/plans.ts` (`PlanId = 'PRO' | 'ADVANCED' | 'ENTERPRISE'`, crediti
  200 / 700 / illimitato) e `src/lib/plans.ts` (`Plan = 'free' | 'starter' | 'pro' |
  'enterprise'`, crediti 3 / 5 / 100 / 500). Nomi di piano diversi, valori diversi, unità
  di misura non tutte confrontabili. La seconda è ancora importata da
  `plan-switcher.tsx`, `team-manager.tsx`, `feature-gate.tsx`, `ReportsTable.tsx`,
  `ShareModal.tsx`, `BuilderWizard.tsx` e `auth/current-user.ts` — non è residuo inerte,
  decide comportamento reale in quei punti. (VERIFICATO su codice, 2026-09-04.)

## Qualità del codice

- `npx eslint .` riporta 12 problemi preesistenti (9 errori, 3 avvisi) in file non
  toccati dai lavori recenti sui crediti. Il più ricorrente è la regola
  `react-hooks/set-state-in-effect` (setState sincrono dentro un `useEffect`): 8 delle
  12 segnalazioni, sparse in `two-factor.tsx`, `cookie-banner.tsx`, `NavItem.tsx`,
  `ThemeToggle.tsx`, `manual-form-financial.tsx`, `onboarding-flow.tsx`,
  `receivable-form-dialog.tsx`, `recurring-expense-form-dialog.tsx`. Non corretti: sono
  fuori dallo scope di ogni lavoro recente e toccano componenti delicati (onboarding,
  2FA, form) dove una correzione affrettata rischia più del problema stesso.
  (VERIFICATO eseguendo `npx eslint .`, 2026-09-04.)

## Finestre temporali e date — una zona da rivedere per intero

Le finestre temporali (mesi, periodi, confronti fra periodi) e il fuso orario hanno
prodotto correzioni ripetute in questo progetto, non un incidente isolato. Trovati nella
cronologia git almeno questi commit distinti, ognuno per un difetto diverso legato a
date o finestre temporali:
  - `e38353b` fix(ai): use Europe/Rome timezone for due dates and overdue days
  - `60f51cd` fix(ai): pass explicit daysOverdue and timezone-safe due dates to AI context
  - `fc83e9e` fix: precise calendar-month windows, day-parity comparisons, partial-month marking
  - `98ad8b5` fix: month-over-month compares the two months it names, or nothing
  - `4bf7e8d` fix: numbers under a period filter follow the period
Questa lista viene da `git log --oneline --all --grep` sui messaggi di commit, non da una
rilettura riga per riga di ogni diff: il conteggio di cinque è quello che il fondatore
aveva in mente nel dettarla, e i cinque commit sopra lo confermano come ordine di
grandezza plausibile, non come conteggio certificato. Il pattern che vale la pena notare
è che gli helper corretti esistono già e sono documentati (`src/lib/timezone.ts`:
`toAppDateString`, `appDateStartUTC`, `daysOverdueOf` menzionato in CLAUDE.md §5) — il
problema ricorrente non è la mancanza di uno strumento giusto, è che nuovo codice
continua a scrivere `toISOString().slice(0,10)` o un confronto di mesi a mano invece di
usarlo. Vale la pena, prima o poi, un giro con `grep -rn "toISOString().slice"` su
`src/` per vedere se resta qualche altro punto scoperto, invece di aspettare il prossimo
bug per scoprirlo. (VERIFICATO su `git log`, 2026-09-04 — non ripetuto il grep di
verifica in questa sessione: è un suggerimento per la prossima.)

## Analisi finanziaria

- `PeriodComparison.netMarginDelta` (`src/lib/analysis/financial.ts:228`, calcolato alla
  riga 240) non ha nessun lettore fuori da quel file (grep `netMarginDelta` su `src/`,
  escludendo `financial.ts`: zero risultati). Campo calcolato e mai mostrato.
  (VERIFICATO su codice, 2026-09-04.)

## Backlog di sicurezza — righe di CLAUDE.md §10 non riverificate in questa sessione

Durante la correzione di CLAUDE.md (2026-09-04) sono state riverificate solo cinque
affermazioni specifiche, indicate dal fondatore. Le altre due righe rimaste in §10 hanno
un'aria sospetta e vale la pena controllarle alla prossima occasione, invece di fidarsi:
  - "Nessun endpoint GDPR export/cancellazione account" — esistono
    `src/app/api/gdpr/export/` e `src/app/api/gdpr/account/`, e CLAUDE.md §12 descrive
    già un flusso GDPR con `deletionRequestedAt` e il cron `gdpr-purge`. Sembra falsa
    quanto le cinque corrette, ma non era nell'elenco da correggere: lasciata così com'è
    in §10, con una nota lì.
  - "Webhook Stripe senza idempotency su event.id" — esiste la migration
    `20260822200000_stripe_webhook_idempotency` e una tabella `StripeWebhookEvent`
    dedicata. Stessa situazione: probabilmente falsa, non corretta perché fuori
    dall'elenco di questo lavoro.
