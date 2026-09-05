# Scoperte da valutare

Elenco delle cose notate durante i lavori su Anlyra e non ancora affrontate. Non è un
elenco di bug da correggere subito: è la lista da cui ogni sessione nuova dovrebbe
partire, per non riscoprire da capo cose già viste. Ogni voce ha file e riga verificati
sul codice alla data indicata; se una voce smette di essere vera, va aggiornata sul posto
(non cancellata), così la storia resta leggibile. Vedi anche CLAUDE.md §9 e §10 per i
debiti già classificati come tali.

## Un account, più aziende (ricognizione 2026-09-04, chiuse due porte su tre)

La ricognizione "un account, un'azienda" ha trovato tre porte aperte e
indipendenti fra loro, oltre a sei cose notate ma non affrontate perché quel
lavoro era di sola lettura. Registrate qui tutte e sei come richiesto, con lo
stato AGGIORNATO dopo il lavoro di chiusura che è seguito sullo stesso giorno
(branch `claude/close-credit-abuse-paths`).

**Aggiornamento 2026-09-05 (branch `claude/block-demo-login`)**: chiuse anche
le due porte rimaste dal lavoro precedente.
- `src/app/[locale]/onboarding/organization/page.tsx` — la SECONDA pagina di
  creazione azienda, raggiungibile da `/welcome`, segnalata nel rapporto della
  sessione precedente ma non ancora chiusa (era la stessa mancanza di guardia
  di `onboarding/page.tsx`, riga 34-38 qui sotto, ma non era stata inclusa in
  quel lavoro). RISOLTO: stessa protezione, ma in un `layout.tsx` nuovo
  (quella pagina è un Client Component, `getSessionState()` non può girarci
  dentro direttamente). Cercate anche altre pagine che postano su
  `/api/onboarding/organization`: nessun'altra esiste oltre a queste due.
- L'account demo (`demo@pro.app`) poteva ancora autenticarsi con la password
  reale attraverso il modulo di login normale, ottenendo una sessione
  NextAuth vera e scrivibile — un varco indipendente dalle due pagine di
  creazione, perché non passava da nessuna delle due. RISOLTO in
  `src/auth.ts`: l'indirizzo demo è rifiutato nel percorso Credentials con un
  errore dedicato (`DEMO_LOGIN_DISABLED`), stessa struttura del controllo
  `EMAIL_NOT_VERIFIED` già presente. Il flusso di sola lettura via cookie
  (`hasDemoSession`, dietro "prova la demo") resta invariato e non c'entra
  con questo percorso.
- Aggiunto anche `prisma/check-orgs-per-account.ts`
  (`npm run db:check-orgs-per-account`), script di sola lettura sullo stesso
  schema di `check-credit-purchases.ts`: elenca gli account membri di più di
  un'organizzazione, con email, quante ne hanno, i nomi, e i crediti AI
  totali in loro possesso. Utile per capire se le porte ora chiuse siano già
  state usate in passato.

RISOLTE in quel lavoro (non sono più aperte, lasciate per la storia):
- **`/api/ai/alerts/[id]/analyze` consumava crediti senza chiamare
  `requireActiveAccess`** — l'unica delle quattro rotte che spendono crediti a
  non farlo. RISOLTO: aggiunta la stessa guardia delle altre tre, stesso
  punto nella sequenza, stesso errore `TRIAL_EXPIRED`/402. Verificato con la
  funzione vera contro un database locale: un'organizzazione a prova scaduta
  viene rifiutata e i crediti restano identici, riletti dal database.
- **`/api/onboarding/organization` era l'unica rotta di scrittura del
  prodotto senza `requireWritableOrg`** — chi accedeva come `demo@pro.app`
  poteva creare un'azienda nuova e uscire dalla gabbia di sola lettura.
  RISOLTO: la sessione demo è riconosciuta per identità (email a confronto
  con `DEMO_EMAIL`, ora esportata da `src/lib/session.ts`) prima che esista
  un'organizzazione da controllare — `requireWritableOrg` da solo non
  bastava, perché questa rotta deve restare aperta a un utente nuovo che non
  ha ancora nessuna organizzazione, e `getAuthContext()` restituisce null
  proprio per quel caso.
  Nella stessa serie di commit è stata chiusa anche una quarta porta,
  scoperta durante la ricognizione ma non contata fra le tre originarie:
  `src/app/[locale]/onboarding/page.tsx` non aveva nessuna guardia, e un
  utente con già un'azienda ci arrivava scrivendo l'indirizzo a mano. Ora
  chi ha già un'organizzazione (stato `'ok'`) viene rimandato a `/overview`.

ANCORA APERTE (RIVERIFICATE una per una il 2026-09-05, tutte ancora vere — nessuna
modifica al modello dati, nessun limite al numero di aziende, come vietato da entrambi i
lavori che le hanno incontrate):
- **La creazione di un'organizzazione non scrive nessun audit log.**
  `organization.create` non esiste nel catalogo delle azioni di audit
  (`src/lib/audit/actions.ts` prevede solo `organization.update`). Non c'è
  quindi traccia storica di CHI ha creato COSA — che è anche il motivo per
  cui il punto successivo non è implementabile a costo zero.
- **`assertWithinLimit()` (`src/lib/billing/server-gate.ts`) non è chiamata
  da nessuna parte in tutto il repository: codice morto.** E i piani
  dichiarano già un limite — `PLANS.PRO.limits.orgs = 1`,
  `PLANS.ADVANCED.limits.orgs = 1`, `PLANS.ENTERPRISE.limits.orgs = -1`
  (illimitato) — che nessuno legge. La regola "un account, un'azienda
  creata" che il fondatore ha deciso troverebbe qui il meccanismo già
  pronto, ma applicarla oggi chiuderebbe fuori chi è stato solo INVITATO in
  un'azienda altrui (ha già una membership pur non avendo creato niente) —
  serve prima il dato del punto successivo.
- **Il modello dati non distingue un'azienda CREATA da una RICEVUTA per
  invito** — **AGGIORNATO 2026-09-05**: non è più del tutto vero che "chi crea
  riceve lo stesso ruolo assegnabile per invito". Da un lavoro successivo
  (branch `claude/billing-owner-only`), chi CREA un'organizzazione riceve ora
  `'owner'` (per poter usare la fatturazione, riservata a quel ruolo — vedi
  CLAUDE.md §7), mentre un invito non può MAI assegnare `'owner'`
  (`VALID_ROLES` in `api/onboarding/organization/route.ts` per gli invitati
  durante il setup: `'admin' | 'editor' | 'viewer'`, senza `'owner'`). Questo
  rende `Membership.role === 'owner'` un indizio ragionevole di "questo membro
  ha creato l'organizzazione" per le organizzazioni create D'ORA IN POI — ma
  NON un dato affidabile al 100%: il pannello admin può comunque impostare
  `'owner'` a mano su chiunque (`setMemberRole`/`setMemberRoleByEmail`), e le
  organizzazioni create PRIMA di questo fix hanno ancora il creatore come
  `'admin'`, indistinguibile da un `'admin'` invitato legittimamente. Un campo
  esplicito (`Organization.createdByUserId`, scritto nella stessa transazione
  della creazione) resterebbe l'unico modo per saperlo con certezza — non
  implementato: cambiamento al modello dati, fuori da tutti i lavori che
  hanno incontrato questo punto finora.
- **Non esiste nessuna rotta per invitare qualcuno in un'azienda già
  esistente.** `prisma.invite.create` compare in un solo punto di tutto il
  repository, dentro `/api/onboarding/organization` — cioè l'UNICO modo di
  invitare un collega oggi è creare una nuova azienda. `/api/settings/team`
  espone solo GET.
- **Ogni organizzazione creata dalla rotta di onboarding resta con
  `Organization.plan = "STARTER"`** (il default dello schema, mai
  sovrascritto da quella rotta) — non è una deduzione: osservato dal vivo
  dieci volte su dieci creando organizzazioni di prova. Il fatto generale
  era già registrato più sotto in "## Piani"; qui si aggiunge solo la
  conferma diretta che succede ogni volta, non solo in teoria.
- **NUOVO 2026-09-05**: conseguenza diretta del cambio di ruolo del creatore
  (sopra) — le organizzazioni create PRIMA del fix hanno il fondatore/creatore
  come `'admin'`, che oggi non può più aprire il portale di fatturazione
  (riservato a `'owner'`, vedi CLAUDE.md §7). Non esiste un modo di contare
  quante sono con certezza (vedi il punto sopra: `'admin'` da solo non basta a
  distinguere un creatore pre-fix da un admin invitato). Il pannello admin ha
  ora scheda Organizzazioni → elenco membri (email + ruolo) → modulo "Cambia
  ruolo di un membro (per email)", per correggerle a mano una alla volta.

## Email di prova / abbonamenti (aggiunto 2026-09-04)

- **Un cliente che si abbona e poi disdice non riceve più NESSUNA email da
  questo cron, nemmeno di riattivazione.** Conseguenza diretta della
  correzione che azzera `Organization.trialEndsAt` nel momento in cui un
  abbonamento diventa attivo (`src/app/api/webhooks/stripe/route.ts`,
  `handleCheckoutCompleted` e `handleSubscriptionUpdated`; `admin/actions.ts`,
  `setPlan`): una volta azzerato, trialEndsAt resta null per sempre — niente
  nel codice lo rimette a una data. Il cron di prova
  (`src/lib/cron/trial-check.ts`) seleziona le organizzazioni candidate solo
  su `trialEndsAt: { not: null }`, quindi un'organizzazione disdetta
  (BillingSubscription.status passa a "canceled" via
  `handleSubscriptionDeleted`) non rientra mai più fra i destinatari.
  È una scelta corretta per lo scopo di QUESTO cron (non deve mai dire "sei
  ancora in prova" a chi ha già pagato), ma lascia scoperto un caso diverso:
  nessuna email di "win-back" per un cliente perso. Se il fondatore vuole
  un flusso di riattivazione per chi ha disdetto, serve un meccanismo
  apposta — non trialEndsAt, che ha un significato diverso. Segnalato, non
  deciso qui. (VERIFICATO su codice, 2026-09-04.)
- **`admin/actions.ts`, `setPlan()`: il ramo `update: { plan }` dell'upsert
  su BillingSubscription non tocca mai `status`.** Se un'organizzazione ha
  una riga con status "canceled" (abbonamento reale, disdetto) e il
  fondatore le riassegna un piano dal pannello per riattivarla a mano, il
  piano cambia ma lo stato resta "canceled" — l'organizzazione continua a
  essere trattata come non pagante ovunque nel codice legga lo status
  (`requireActiveAccess`, il cron dei crediti). Notato mentre si
  verificava dove un abbonamento "diventa attivo" per azzerare
  trialEndsAt: quel ramo NON è un'attivazione (per questo non azzera
  trialEndsAt), ma probabilmente dovrebbe esserlo se lo scopo è
  riattivare un cliente. Non corretto: fuori dallo scope del lavoro che
  l'ha notato. (VERIFICATO su codice, 2026-09-04.)
- **Le email transazionali (prova, pagamento, ecc.) sono tutte in italiano
  fisso, con link costruiti a mano su `/it/`** (es. `trial-check.ts`:
  `` `${siteUrl()}/it/settings/billing` ``). Un utente con `locale: 'en'`
  riceve comunque testo e link italiani. Incontrato di nuovo lavorando su
  `trial-check.ts`, già segnalato come fuori scope dal compito stesso che
  l'ha incontrato: non è stato toccato. (VERIFICATO su codice, 2026-09-04.)

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

- `npx eslint .` riporta 12 problemi preesistenti (9 errori, 3 avvisi), sparsi su 12
  file — **elenco CORRETTO 2026-09-05**: la voce precedente (2026-09-04) elencava 8 file
  come tutti `react-hooks/set-state-in-effect`, ma due di quegli otto
  (`manual-form-financial.tsx`, `onboarding-flow.tsx`) sono in realtà
  `react-hooks/incompatible-library` (un'altra regola, un warning non un errore), e
  mancavano quattro file comparsi nel frattempo: `postcss.config.mjs`
  (`import/no-anonymous-default-export`, warning),
  `settings/billing/page.tsx` (`react-hooks/immutability` su
  `window.location.href`, errore), `ai/chat/chat-client.tsx` e
  `components/ai/alert-detail.tsx` (entrambi `react-hooks/set-state-in-effect`, errore).
  Il conteggio totale (12/9/3) era già giusto: solo l'elenco dei file non lo era più.
  Elenco vero oggi — **errori** (`react-hooks/set-state-in-effect`, tranne dove
  indicato): `two-factor.tsx`, `cookie-banner.tsx`, `NavItem.tsx`, `ThemeToggle.tsx`,
  `receivable-form-dialog.tsx`, `recurring-expense-form-dialog.tsx`,
  `ai/chat/chat-client.tsx`, `components/ai/alert-detail.tsx` (8), più
  `settings/billing/page.tsx` (`react-hooks/immutability`, 1) = 9 errori. **Avvisi**:
  `manual-form-financial.tsx`, `onboarding-flow.tsx` (`react-hooks/incompatible-library`)
  e `postcss.config.mjs` (`import/no-anonymous-default-export`) = 3 avvisi. Non
  corretti: sono fuori dallo scope di ogni lavoro recente e toccano componenti delicati
  (onboarding, 2FA, chat, form) dove una correzione affrettata rischia più del problema
  stesso. (VERIFICATO eseguendo `npx eslint .` per intero, non solo `tail`, 2026-09-05.)
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

**Il grep suggerito sopra è stato fatto, 2026-09-05**: 4 punti trovano ancora
`toISOString().slice(...)` in `src/`, di rischio diverso:
  - `src/components/data/manual-form-financial.tsx:48` (`occurredAt`) e
    `src/components/data/manual-form-customer.tsx:38` (`period`) — valore di default di
    un campo data in un modulo, calcolato lato client con `new Date()` (che restituisce
    UTC, non l'ora locale del browser): stesso pattern di bug già corretto altrove
    (vicino alla mezzanotte italiana il giorno può risultare quello sbagliato). RISCHIO
    REALE, non toccato: trovato durante un lavoro di documentazione, non di codice.
  - `src/app/[locale]/(dashboard)/settings/security/PrivacyPanel.tsx:62` e
    `src/app/api/gdpr/export/route.ts:240` — solo il NOME del file di export GDPR
    scaricato (`anlyra-export-2026-09-05.json`). Rischio cosmetico: nel peggiore dei
    casi il nome del file porta la data di ieri invece di oggi, il contenuto non
    cambia. Non prioritario.
  (VERIFICATO su codice, 2026-09-05.)

## Analisi finanziaria

- `PeriodComparison.netMarginDelta` (`src/lib/analysis/financial.ts:228`, calcolato alla
  riga 240) non ha nessun lettore fuori da quel file (grep `netMarginDelta` su `src/`,
  escludendo `financial.ts`: zero risultati). Campo calcolato e mai mostrato.
  (VERIFICATO su codice, 2026-09-04.)

## Email — HTML e oggetto (aggiunto 2026-09-04, seconda voce del giorno)

- **Il login OAuth (Google, Microsoft Entra ID) può ancora impostare
  `User.name` senza passare dalla validazione nuova.** `src/auth.ts` usa
  `PrismaAdapter(prisma)` (riga 128): quando un utente nuovo accede con Google
  o Microsoft, l'adapter di NextAuth crea la riga `User` leggendo il nome dal
  profilo OAuth, SENZA passare da `settings/profile`, `register` o
  `onboarding/organization` — cioè senza incontrare mai il controllo sui
  caratteri di controllo aggiunto in questa sessione
  (`src/lib/validation/display-name.ts`). Non corretto: intervenire
  richiederebbe toccare l'adapter di NextAuth o aggiungere un callback
  `signIn`/`createUser` dedicato, un cambiamento diverso e più rischioso dei
  tre punti che il compito nominava esplicitamente (profilo, onboarding,
  impostazioni organizzazione). Nella pratica il rischio è già coperto
  all'uscita: qualunque nome, comunque sia arrivato nel database, viene
  comunque neutralizzato da `escapeHtml` quando finisce in un'email — quindi
  non è una falla nell'obiettivo di questo lavoro, è un buco nella difesa "in
  profondità" alla fonte. (VERIFICATO su codice, 2026-09-04.)
- **I controlli di formato email sono deboli, e permettono caratteri
  strutturalmente pericolosi per un `mailto:`.** La registrazione accetta
  `/^[^@\s]+@[^@\s]+\.[^@\s]+$/` (`src/app/api/auth/register/route.ts`) e un
  invito accetta `/\S+@\S+\.\S+/` per l'indirizzo del destinatario
  (`src/app/api/onboarding/organization/route.ts`): nessuno dei due vieta
  `?`, `&`, `=`, `<`, `"` dentro l'indirizzo. Corretto ALLA FONTE DI USCITA
  (le email adesso codificano l'indirizzo con `encodeURIComponent` prima di
  metterlo in un `mailto:` — `src/lib/email/templates/_escape.ts`,
  `escapeMailtoAddress`), quindi oggi non è più sfruttabile per email. Resta
  però vero che un indirizzo con quei caratteri può essere salvato: se in
  futuro comparisse un altro punto che usa l'indirizzo email in un contesto
  diverso da un mailto: (per esempio dentro un URL costruito a mano), quel
  punto nuovo NON erediterebbe automaticamente la protezione. Vale la pena,
  prima o poi, stringere quei due controlli di formato alla fonte, non solo
  proteggere ogni singolo punto di uscita uno per uno. (VERIFICATO su codice,
  2026-09-04.)
- **Un ritorno a capo in un nome può ancora finire, letterale, dentro il
  corpo HTML** (per esempio nel testo del tag `<title>` o nel preheader
  nascosto) — non è una falla: `escapeHtml` neutralizza i cinque caratteri
  che permettono di uscire da un tag o un attributo (`< > & " '`), e un
  ritorno a capo dentro il TESTO di un tag non ne rompe la struttura né
  inietta nulla. È un difetto puramente estetico (il sorgente HTML dell'email
  risulterebbe spezzato su più righe in quel punto), non di sicurezza — la
  sanificazione dei caratteri di controllo/ritorni a capo si applica solo
  all'OGGETTO dell'email (`sanitizeSubjectText`), dove il rischio è diverso
  (iniezione di intestazioni), non al corpo HTML. Con la validazione nuova
  alla fonte (punto 5 del compito) nessun nome NUOVO potrà più contenerne
  uno; un nome già salvato prima di questa correzione, se ne contenesse uno,
  lo mostrerebbe ancora così finché non viene risalvato. Non corretto:
  fuori dall'obiettivo dichiarato del compito (che riguardava l'HTML e
  l'oggetto come RISCHI DI SICUREZZA, non l'estetica del sorgente).
  (VERIFICATO su codice, 2026-09-04.)
- **NUOVO 2026-09-05**: `baseLayout` (`src/lib/email/templates/_layout.ts`) applica
  `escapeHtml` UNA VOLTA SOLA, al centro, a `title`/`preheader`/`ctaButton.label`/
  `userEmail` — per costruzione, se un chiamante passasse un valore GIÀ escapato
  (per esempio perché ha applicato `escapeHtml` anche lui, per abitudine o per copia
  da un altro modello), il risultato sarebbe un doppio escape (es. `&amp;amp;` invece
  di `&amp;`), visibile all'utente come testo corrotto. Verificato che NESSUNO degli
  11 modelli lo fa oggi (grep su `title:`/`preheader:`/`userEmail:` seguiti da
  `escapeHtml` dentro le chiamate a `baseLayout`: zero risultati) — non è un bug
  attivo, è un rischio per codice futuro. Non corretto: nessuna modifica necessaria
  oggi, solo da tenere a mente scrivendo un modello nuovo. (VERIFICATO su codice,
  2026-09-05.)

## Backlog di sicurezza — righe di CLAUDE.md §10 (RISOLTO 2026-09-05)

Durante la correzione di CLAUDE.md (2026-09-04) erano state riverificate solo cinque
affermazioni specifiche, indicate dal fondatore. Le altre due righe rimaste in §10 avevano
un'aria sospetta ed erano state segnalate qui per un controllo alla prossima occasione:
  - "Nessun endpoint GDPR export/cancellazione account" — esistono
    `src/app/api/gdpr/export/` e `src/app/api/gdpr/account/`, e CLAUDE.md §12 descrive
    già un flusso GDPR con `deletionRequestedAt` e il cron `gdpr-purge`.
  - "Webhook Stripe senza idempotency su event.id" — esiste la migration
    `20260822200000_stripe_webhook_idempotency` e una tabella `StripeWebhookEvent`
    dedicata.

**RISOLTO** nella sessione di riverifica sezione-per-sezione di CLAUDE.md (2026-09-05,
branch `claude/verify-claude-md-sections`): entrambe verificate fino in fondo, non solo
"i file esistono" ma che il codice li USA davvero (`prisma.stripeWebhookEvent.create` su
`event.id` prima di processare l'evento; le due route GDPR lette e confermate reali).
Entrambe erano FALSE. CLAUDE.md §10 aggiornato di conseguenza. Lasciata qui la voce, come
richiesto, per la storia — non cancellata.

## Ruoli (aggiunto 2026-09-05)

- **`editor` e `viewer` si comportano in modo IDENTICO oggi.** Cercato in tutto `src/`
  ogni confronto/controllo sui valori `'editor'` e `'viewer'` di `Membership.role`:
  esistono solo due guardie in tutto il repository, `isManagerRole` (owner+admin) e
  `isOwnerRole` (solo owner, vedi sotto) — nessuna delle due, né nient'altro, distingue
  editor da viewer. Nessun punto del codice impedisce a un `viewer` di creare o
  modificare dati, nonostante il nome suggerisca un ruolo di sola lettura: quella
  distinzione non è implementata. Ora anche in CLAUDE.md §7, con lo stesso avviso.
  (VERIFICATO su codice, 2026-09-05.)
- **La fatturazione è ora riservata al solo `owner`** (branch
  `claude/billing-owner-only`) e **chi crea un'organizzazione ne diventa `owner`**, non
  più `admin` (stesso branch) — entrambe documentate per intero in CLAUDE.md §7, non
  ripetute qui. Conseguenza pratica registrata sopra, in "Un account, più aziende": le
  organizzazioni create prima di questo fix hanno ancora il creatore come `admin`, e
  vanno corrette a mano dal pannello admin (nuovo modulo per email, scheda
  Organizzazioni — branch `claude/admin-panel-set-role`).

## Duplicazioni nei file di traduzione (aggiunto 2026-09-05)

- **La chiave `"moneyBack"` compare DUE VOLTE in `src/messages/it.json`** (righe 1883 e
  1980 alla data della verifica), in due namespace diversi del file JSON — non è un
  errore di sintassi (JSON valido: due oggetti distinti in due punti annidati diversi,
  non una chiave duplicata nello stesso oggetto), ma vale la pena controllare se sia
  intenzionale (due usi diversi per la stessa etichetta) o una copia-incolla mai
  ripulita. Non toccato: trovato durante un lavoro sulla fatturazione che non
  riguardava i testi. (VERIFICATO su codice, 2026-09-05, grep `"moneyBack"` su
  `src/messages/it.json`.)

## Dominio: .env.example ancora su anlyra.it (aggiunto 2026-09-05)

- **`.env.example` contiene ancora `anlyra.it`** in due punti: `# AUTH_URL=https://anlyra.it`
  (commentato) e `RESEND_FROM="Anlyra <noreply@anlyra.it>"` (valore di esempio attivo),
  più un commento `# In produzione settare a https://anlyra.it`. Il dominio vero, verificato
  sul codice vivo (`src/lib/company.ts`, `src/app/layout.tsx`, `robots.ts`, `sitemap.ts`,
  i testi legali in `src/messages/`), è `anlyra.com` — coerente con l'avviso in cima a
  CLAUDE.md. Già corretto nello stesso senso in `docs/SECURITY.md` (branch
  `claude/fix-claude-md-accuracy`, 7 punti). `.env.example` non è stato toccato in
  nessuno dei lavori che hanno incontrato questo dominio finora: è un file di
  configurazione template, non nominato da nessuno di quei compiti. Da correggere
  quando capiterà un lavoro che tocca esplicitamente quel file. (VERIFICATO su codice,
  2026-09-05.)

## Codice legacy scollegato dal sistema reale (aggiunto 2026-09-05)

- **`src/lib/session-store.ts` e `src/components/feature-gate.tsx` usano uno store
  Zustand legacy** (`useSession`, persistito come `"pro:session"`) **con un campo
  `plan` finto** (default `'pro'`, mai sincronizzato con `BillingSubscription` o con
  nessun dato reale) — probabilmente un residuo dell'architettura pre-NextAuth (cookie
  custom `pro_session`, già segnalata come storica in `HANDOFF_BUNDLE.md`/
  `CONTRIBUTING.md`, branch `claude/fix-claude-md-accuracy`). NON è codice morto:
  `FeatureGate` (`feature-gate.tsx`) è usato davvero in almeno due pagine reali
  (`src/components/security/audit-log.tsx`, `ai/agent/page.tsx` — grep `FeatureGate`
  su `src/`), quindi il piano finto che legge decide comportamento vero in produzione
  oggi, non solo in teoria. Scollegato dal vero sistema di ruoli/piano (`Membership.role`,
  `BillingSubscription.plan`): qualunque componente lo usi per decidere cosa mostrare
  sta decidendo su un dato finto, non sul piano reale dell'organizzazione. Non toccato:
  trovato mentre si cercava un modo di portare il ruolo reale lato client per la
  fatturazione (branch `claude/billing-owner-only`), che ha usato un context nuovo
  invece di questo store per non ereditarne il problema. (VERIFICATO su codice,
  2026-09-05.)
