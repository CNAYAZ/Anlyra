ps aux | grep "next dev" | grep -v grep
# Anlyra — Stato reale del progetto e valutazione

> **Cos'è questo file.** Non è un handoff e non è una lista di cose da fare. È una
> **valutazione del progetto fatta leggendo il codice vero sul repository** — le pagine,
> le API, i modelli del database — con dentro un'opinione, come la darebbe un collega di
> un team che guarda il lavoro fatto e dice la sua. Serve a far capire alla prossima
> sessione **dove siamo adesso davvero**, non dove vogliamo arrivare (quello lo dicono
> gli handoff).
>
> **Data**: 2026-06-30. **Basato su**: branch `claude/merge-repos-nextjs-rOZU3`,
> ultimo commit letto `d18bc2d`.
>
> **Aggiornato il 2026-06-30 (sera)**: vedi §8 in fondo — costruito il primo pezzo di prodotto vero (motore dei fatti + pagina Situazione) e spente altre scenografie.
>
> **Aggiornato il 2026-07-01**: vedi §9 in fondo — cambio password reale, bonifica branch (da 64 a 2), fix font, refactor getOrgData 3/4. ⚠️ PASSWORD DEMO CAMBIATA: ora `NuovaDemo2026!`.
>
> **Aggiornato il 2026-07-03**: vedi §10 — Anlyra è ONLINE su Vercel (anlyra.vercel.app), migrato a PostgreSQL/Supabase. DB dev ora è Postgres (non più SQLite).
---

## 0. Regole d'oro (leggere prima di tutto)

Queste tre regole valgono più di qualsiasi contenuto qui sotto.

**1. Un consiglio è un consiglio, non un ordine. Decide il fondatore.**
Questo documento contiene un'opinione, e anche le sessioni future ne avranno una. Va bene
così: un team serve proprio a questo. Ma nessuna sessione di Claude deve aggiungere,
togliere o riscrivere parti del progetto solo perché *le sembra* giusto. La rotta la
tiene il fondatore (cnayaz). Il compito di Claude è: studiare, dire onestamente cosa
vede, proporre una direzione con le sue ragioni — e poi **fare ciò che il fondatore
decide**. Se ogni sessione cambia il piano a modo suo, il progetto lo guida l'ultimo
modello che ha parlato, non chi lo possiede. Questo non deve succedere.

**2. La verità è nel codice e nel database, non nei file `.md`.**
I documenti di appunti (handoff, note, riassunti) sono utili ma **possono variare ed
essere sbagliati** — è già successo più volte. Prima di dare per vero ciò che un `.md`
afferma sullo stato del progetto, **verificalo sul codice vero e sul database vero**.
Un endpoint che "dovrebbe salvare" va controllato leggendo se fa davvero una query; un
dato che "dovrebbe esserci" va contato nel DB. Mai fidarsi della descrizione: fidarsi
della fonte.

**3. Distinguere sempre "verificato" da "letto" e "implementato" da "pianificato".**
Chi scrive un report deve dire chiaramente cosa ha controllato con i propri strumenti e
cosa ha solo letto o dedotto. Vale anche per questo documento: vedi la nota di onestà
qui sotto.

> **Nota di onestà su questo documento.** La valutazione qui dentro è solida perché
> nasce dalla lettura completa del codice (pagine, API, modelli, punti finti, buchi). Ma
> chi scrive **non ha visto il sito girare nel browser** — ha letto cosa fa il codice,
> non l'ha visto vivere. Quindi l'opinione che segue è quella di chi ha studiato le carte
> a fondo, non di chi ha collaudato il prodotto in mano. Dove un giudizio dipende dal
> comportamento a runtime, è segnalato.

---

## 1. Cos'è Anlyra (il prodotto, in una frase)

Anlyra è un **consulente AI per le PMI**: guarda i dati veri dell'azienda (entrate,
spese, crediti) e dà consigli su come gestire meglio — cashflow, gestione, e in
prospettiva marketing/ads/branding — per far guadagnare tempo e denaro riducendo
l'attrito. Non sostituisce l'imprenditore: è un "quasi-CEO" che lo aiuta a vedere quello
che da solo non vedrebbe.

Tutto il resto del prodotto (le tabelle di entrate/spese, l'import dei dati, lo
scadenzario) sono **gli occhi e le orecchie** di quel consulente: servono perché senza
dati il consulente non ha niente da guardare. Ma la cosa per cui un cliente paga è il
**consiglio ancorato ai suoi numeri reali**, non la tabella.

Questa distinzione è il cuore di tutto. Un'AI che dà consigli generici ("investi nei
social", "tieni d'occhio il cashflow") è un oroscopo: bello, gratis ovunque, inutile.
Un'AI che dice *"le tue spese fornitori sono salite del 18% in tre mesi ma gli incassi
sono fermi; tre clienti ti devono €6.200 da oltre 60 giorni"* vale, perché solo chi ha i
dati di quell'azienda può dirlo. **Il vantaggio di Anlyra è l'aggancio ai dati reali.
Senza quello non c'è prodotto.**

---

## 2. Lo stato reale, letto dal codice (la fotografia onesta)

Il progetto **non è incompleto perché mancano funzioni**. È il contrario: di funzioni ce
ne sono già più di quaranta pagine. Il problema vero è un altro, ed è più scomodo:
**molte funzioni sono gusci — bella interfaccia davanti, motore finto o assente dietro.**

### Il cuore solido (costruito bene E alimentato da dati veri)
Queste sono la spina dorsale, funzionano e vanno difese:
- **Entrate / costi** (`FinancialRecord`): dati veri nel DB. Confermato a runtime sul DB
  demo: 359 movimenti `REVENUE` (≈ €1.526.275) e 320 `COST` (≈ €857.018). Azienda demo
  con una storia finanziaria vera dentro.
- **Scadenzario / crediti** (`Receivable`): CRUD reale, stato OVERDUE ricalcolato
  correttamente dalla data di scadenza.
- **Spese ricorrenti** (`RecurringExpense`): CRUD reale, totali mensili/annuali veri.
- **Import dati** (`data/import`, `data/manual`, `data/history`): transazioni Prisma
  reali, supporta anche estratti conto di banche italiane.
- **Autenticazione completa**: signup, login, verifica email, 2FA TOTP, multi-org,
  inviti — collaudata end-to-end nel browser (a giugno).
- **AI chat / alerts** (con motore a regole): funzionano su dati reali.

### La promessa giusta, costruita male (da rifare sui dati veri)
- **Operations** (clienti, efficienza, team): la promessa — "ottimizza, fammi guadagnare
  tempo" — è giustissima, è il cuore di Anlyra. Ma com'è fatta **oggi è finta**: churn e
  retention calcolati con funzioni seno/coseno, i reparti sono array fissi nel codice.
  L'idea vale; l'implementazione no. Si può **rifare alimentandola dai dati reali** che
  il cliente già ha.

### La scenografia senza fondamenta (richiede dati che il cliente non ha)
- **Mercato** (competitor, posizionamento, trend): la UI fa credere che Anlyra analizzi
  il mercato, ma i motori sotto sono finti — TAM/SAM/SOM con formule fisse (es. TAM = 50
  × fatturato), SWOT come array hardcoded sempre uguale, "quote di mercato" dei competitor
  ottenute moltiplicando il nostro ARR. **Questa roba richiede dati esterni che il cliente
  non possiede** (il fatturato vero dei competitor, le quote reali) e che non può caricare
  dal gestionale. È una funzione che suona bene in un pitch ma che nessun cliente reale ha
  mai chiesto.

### Pezzi che fingono di funzionare (rischio fiducia, da sistemare o nascondere)
Questi sono i più pericolosi, perché un utente può credere di aver fatto una cosa che non
è avvenuta:
- **"Genera insight"** (in `ai/insights`): il bottone c'è, ma chiama un endpoint che è
  uno stub permanente (ritorna sempre 503 "AI disabilitata in demo"). Non genera niente.
- **"Run now"** sui report pianificati: non produce un PDF reale, aggiorna solo un
  timestamp. L'utente crede che il report sia stato generato, non lo è.
- **Cambio password** (in `settings/security`): il form valida lato client ma non risulta
  chiamare nessun endpoint reale. L'utente può credere di aver cambiato la password senza
  che sia successo.
- **Condivisione report** (`share/[token]`): il token non è validato lato server, i dati
  vengono da uno store del browser di chi ha creato il link — quindi il link
  probabilmente **non funziona** se aperto da un altro dispositivo.
- **Integrazioni esterne**: la UI mostra 6 provider come collegabili allo stesso modo, ma
  **solo Stripe sincronizza** (e pure con dati casuali finti, non veri dati Stripe). Gli
  altri 5 falliscono in silenzio scrivendo un log d'errore, senza un messaggio chiaro.

---

## 3. Correzione importante: i numeri segnaposto NON sono dati finti del prodotto

C'è una cosa da chiarire per non far sbagliare le sessioni future, e per correggere un
malinteso facile.

Alcune cifre che si vedevano nel sito e che compaiono in vecchi handoff erano
**segnaposto messi apposta dal fondatore** — servivano a vedere come veniva
l'interfaccia, e a lasciare un riferimento numerico alle sessioni successive. **Non sono
un sintomo di prodotto fasullo.** Mettere un numero di prova in una card per controllare
se sta bene è una cosa normale e giusta.

Questo va tenuto distinto dal problema della sezione 2: **un conto è il numero segnaposto
in una card, un altro è il motore finto dietro a Mercato e Operations**, che calcola con
seno/coseno e array fissi *a prescindere* dai dati. Quei motori restano finti anche
togliendo i segnaposto. Le due cose convivono: i segnaposto erano intenzionali e ok; i
motori finti sono un debito reale. **Non confondere i due.** E soprattutto: non dedurre lo
stato del prodotto dalle cifre viste in un `.md` — vedi regola d'oro n.2.

---

## 4. La mia valutazione, da collega (opinione, non ordine)

Questa è un'opinione. È fondata sulla lettura del codice (vedi nota di onestà in cima).
Il fondatore decide.

**Cosa terrei e renderei solidissimo.** Il cuore vero del prodotto è già lì:
entrate/costi, spese ricorrenti, scadenzario, import dei dati, e l'AI che ci ragiona
sopra. Questo è esattamente il "consulente che guarda i dati e suggerisce" della visione.
È il tesoro. Non si tocca se non per rinforzarlo.

**Cosa metterei a riposo (nascondere, non distruggere).** Mercato — competitor, quote,
trend — secondo me è peso morto **per ora**: richiede dati che il cliente non avrà mai, e
allo stato attuale mente. La mossa che consiglio non è cancellarlo (il codice resta, un
domani potrebbe avere senso con fonti dati esterne), ma **toglierlo dal menu** così
nessuno lo vede e nessuno ci perde la fiducia. Zero rischio, e il prodotto smette di
mentire dal giorno dopo. *Questa è una proposta: la decisione è del fondatore.*

**Cosa rifarei sui dati veri.** Operations ha la promessa giusta ma l'implementazione
finta. Non la butterei: la **ricondurrei ai dati reali** (entrate/spese/scadenze), perché
è lì che nasce il valore — un'osservazione tipo "le spese fornitori sono salite del 20% ma
gli incassi no" vale oro, ed è fattibile con i dati che ci sono già.

**Il principio sotto a tutto.** Una funzione fatta male non è neutra: è **valore
negativo**, perché distrugge la fiducia anche su ciò che funziona. Se un utente apre una
pagina che puzza di finto, non pensa "questa sezione è debole", pensa "questo tool è
fuffa" e non si fida più nemmeno dello scadenzario che invece è ottimo. Per un prodotto
che si venderà **online tramite pubblicità** — dove arriva uno sconosciuto senza nessuno
che gli spieghi nulla — questo è letale. Meno superficie e più sostanza vende; più
superficie piena di gusci no. **La direzione giusta non è aggiungere funzioni, è rendere
vere e solide le poche che contano, e mettere a riposo le scenografie.**

---

## 5. La direzione che vedo (il prossimo mattone)

Il prossimo passo, secondo me, **non è una funzione nuova**. È dare finalmente un senso a
tutto ciò che è già stato costruito, trasformando i dati (oggi tabelle) nel carburante del
consulente.

Il primo mattone in costruzione è esattamente questo: un **motore di "fatti finanziari"**
(`src/lib/facts/financial-facts.ts`, branch `claude/feature-financial-facts-engine`) che
parte dai dati reali (entrate, spese, crediti) e produce **osservazioni specifiche e
ancorate ai numeri** — non frasi generiche. Es.: crediti scaduti con importo e numero di
clienti, spese ricorrenti che pesano troppo sulle entrate, trend di spese/entrate in
peggioramento. Strada scelta: **prima i fatti senza AI** (deterministici, dai dati veri);
**poi**, quando il fondatore attiverà il credito sulla API key Anthropic, l'AI trasformerà
quei fatti in consiglio scritto. Stesso prodotto in due tempi, primo tempo non sprecato.

Ordine dei mattoni successivi (proposta):
1. **Motore dei fatti** (in corso) → verificarlo sui dati demo reali.
2. **Pagina che mostra i fatti** all'utente — qui Anlyra comincia a dire cose vere sui
   soldi di un'azienda reale.
3. **Collegamento dell'AI** (quando ci sarà credito): i fatti diventano consiglio scritto.
4. Solo dopo, valutare quali altri "occhi" servono (es. dati di marketing/ads) per
   estendere i consigli ad altre aree.

---

## 6. Fragilità tecniche da non dimenticare (debito, da affrontare a freddo)

Non urgenti oggi, ma vanno scritte perché si dimenticano e fanno danni:

- **`main` e alcuni branch sono DIVERGENTI, non "indietro".** `origin/main` e alcuni
  feature branch (es. `claude/build-insights-page-6ckal`) sono basati su una **linea di
  sviluppo diversa e vecchia** — centinaia di file di differenza. Il progetto vero vive
  SOLO su `claude/merge-repos-nextjs-rOZU3`. **Un merge superficiale di `main` romperebbe
  tutto** — non è un fast-forward mancato. Da disinnescare con attenzione, non di
  passaggio.
- **Modelli doppioni nel database.** `Kpi` (minuscolo) convive con `KPI` (maiuscolo, quello
  usato); `FinancialData` convive con `FinancialRecord` (quello usato). Due nomi quasi
  identici, uno vivo e uno morto: rischio concreto che una sessione scriva sul modello
  sbagliato. Inoltre `AiAlert`/`AiAlertConfig` sono popolati solo nel seed ma mai letti da
  nessuna route (dati morti), e `OrganizationMember` non è mai usato. L'elenco degli
  "zombie" noti nel CLAUDE.md è **incompleto**.
- **Attenzione inversa**: `Report_b8`, `CustomDashboard_b8`, `NotificationPref_b8` hanno il
  suffisso `_bN` (che di solito indica uno zombie) ma sono **attivi e usati davvero**. Non
  rimuoverli per errore.
- **Assunzione "altrimenti è un costo" nel motore dei fatti.** Il motore considera entrata
  solo ciò che è marcato `REVENUE`, e tutto il resto lo tratta come costo. Sui dati attuali
  (solo `REVENUE` e `COST`) è **corretto**. Ma è un po' troppo fiducioso: se un domani
  entra un record con un tipo scritto diversamente, verrebbe contato come costo senza
  segnalazione. Da irrobustire quando si fa pulizia (es. lista esplicita dei tipi-entrata),
  non adesso.
- **Duplicazioni minori non critiche**: due implementazioni quasi identiche di `ok/fail`
  (`@/lib/api` e `@/lib/api/response`); due moduli di sessione (`@/lib/session` usato,
  `@/lib/auth/session` vecchio). Da unificare un giorno.

---

## 7. Come lavorare su questo progetto (promemoria operativi)

- **Il fondatore non è tecnico.** Claude fa tutto in autonomia, spiega in italiano
  semplice, non chiede passi manuali tecnici.
- **Un mattone alla volta**: una funzione, finita, testata, mergiata. Mai cinque iniziate.
- **Container ≠ Codespace** (L25): le sessioni Claude Code esterne girano in container
  remoti (`CODESPACE_NAME` vuoto); il DB e i file gitignored NON viaggiano, solo git.
  Dichiarare sempre l'ambiente a inizio report. I fix a DB/env vanno fatti dove gira il
  server vero (il Codespace).
- **Quando dici "fatto", provalo** (`git log`, `cat`, `tsc`): mai dichiarare senza prova.
- **Un solo gestore del server**: il terminale col loop di auto-riavvio. Mai `npm run dev`
  diretto. Per riavviare: `pkill -f "next dev"` e attendere.
- **La prova che un dato persiste è una rilettura dal DB**, mai l'interfaccia ottimistica.
- **Prima di un fix sui dati, verificare quali colonne il codice legge davvero** (L30).

---
---

## 8. Aggiornamento 2026-06-30 (sera) — primo pezzo di prodotto vero

Sessione di lavoro che ha trasformato lo stato fotografato sopra. Tutto ciò che segue è
**verificato nel browser sui dati demo reali**, non solo dichiarato.

**Costruito e collaudato (il cuore vero che prima mancava):**
- **Motore dei fatti** (`src/lib/facts/financial-facts.ts` + API `src/app/api/analysis/facts/route.ts`):
  mergiato. Legge i dati reali (FinancialRecord/Receivable/RecurringExpense) e produce osservazioni
  SPECIFICHE ancorate ai numeri — niente AI, niente dati finti. Provato sui dati demo: produce fatti
  veri (crediti scaduti con importo e clienti, quota scaduta, trend spese). Le regole si auto-zittiscono
  se i dati non bastano, invece di inventare. **Promosso col collaudo reale.**
- **Pagina "Situazione"** (`/situazione`, voce di menu in cima sotto la home, icona lampadina):
  mergiata. Mostra i fatti come card con icona e colore per gravità (critico/avviso/info), ordinate per
  gravità, con stati loading/vuoto/errore coerenti col resto. **Verificata nel browser: mostra i fatti
  veri e si RICALCOLA quando cambiano i dati** (confermato cambiando i crediti demo).
- **Seed crediti demo** (`prisma/seed-receivables.ts`, idempotente): 7 crediti realistici da contesto
  ristorazione (3 scaduti, 2 nei termini, 2 pagati, ~€14.500). Eseguito nel Codespace. Ha sostituito il
  vecchio credito-segnaposto da €999. Per rieseguirlo: `npx tsx prisma/seed-receivables.ts`.

**Scenografie messe a riposo (nascoste dal menu/UI, codice conservato, reversibili):**
- **Mercato** e **Operations**: tolte dal menu (motori finti con formule fisse/seno-coseno, richiedono dati
  che il cliente non ha o vanno rifatti sui dati veri). Codice intatto nel repo.
- **Bottoni "Genera insight" e "Esegui ora" (report)**: nascosti — promettevano azioni non implementate
  (lo stub 503 e il "run now" che non genera PDF). Codice e API conservati.
- **Risultato**: ad oggi ogni funzione visibile nel menu e ogni bottone visibile fanno una cosa VERA.
  Niente più gusci sotto gli occhi dell'utente.

**Stato del prodotto adesso (sintesi onesta):** esiste uno scheletro di prodotto VERO e onesto —
dati reali → motore che li legge → pagina che dice all'imprenditore cosa guardare. È la prima forma
concreta del "consulente AI ancorato ai dati reali". Piccolo, ma vero e collaudato.

**Prossimi passi (in ordine di valore, per la sessione futura):**
1. **Collegare l'AI** (quando ci sarà credito sulla API key Anthropic): i fatti deterministici diventano
   il carburante di un consiglio scritto dall'AI. È il salto da "elenco di fatti" a "consiglio del quasi-CEO".
2. **Riparare il cambio password** scollegato in `settings/security` (è sicurezza, non cosmetica).
3. **Verificare la condivisione report** (`share/[token]`) — probabilmente non funziona da altri dispositivi.
4. **A mente fresca**: chirurgia dei branch e di `main` divergente; pulizia doppioni Prisma (Kpi/KPI,
   FinancialData/FinancialRecord); residuo `runMutation` non più usato in `reports/page.tsx`.

**Nota di metodo confermata:** in questa sessione Claude Code (Sonnet) ha più volte corretto descrizioni
imprecise contenute nei prompt leggendo il codice vero — esattamente la regola d'oro n.2. Funziona: i prompt
vanno dati, ma chi esegue deve sempre verificare sulla fonte.
---

## 9. Aggiornamento 2026-07-01 — sicurezza, bonifica repo, performance, dati veri

Sessione lunga e produttiva. Tutto verificato (browser o confronto dashboard-contro-DB), non solo dichiarato.

### ⚠️ CREDENZIALE CAMBIATA — LEGGERE
La password dell'utente demo NON è più `DemoAnlyra2026!`. Ora è **`NuovaDemo2026!`**
(cambiata collaudando il cambio-password reale). Login demo: `demo@pro.app` / `NuovaDemo2026!`.

### Cambio password reale (sicurezza)
Il form di cambio password in `settings/security` era finto (non salvava nulla). Ora è vero:
nuova route `POST /api/auth/change-password` (modellata sul reset-password), che verifica la vecchia
password, impone la policy (12 caratteri), e salva l'hash. Vincolo di sicurezza rispettato: usa `auth()`
reale, MAI il fallback demo di `getCurrentContext`. **Collaudato end-to-end nel browser**: vecchia password
sbagliata → rifiutata; cambio → ok; logout → la vecchia non entra più, la nuova sì.

### Bonifica repository (da 64 branch a 2)
Diagnosi di Fable 5: l'allarme "main è una linea divergente pericolosa" era ESAGERATO — main è solo il
tronco vecchio (fermo al 3 maggio), senza contenuto unico, ma è il DEFAULT BRANCH (trappola: cloni/deploy
vanno sul codice vecchio). Eseguito: backup totale (66 tag `archive/*` su GitHub + bundle offline
`anlyra-backup-2026-07-01.bundle`), poi cancellati 60 branch già mergiati + 3 superstiti superati.
Restano solo `claude/merge-repos-nextjs-rOZU3` (tronco vivo) e `main`.
**IN SOSPESO — decisione su main**: renderlo il default giusto. Due strade (Fable le ha analizzate):
(A2) riconciliazione senza force-push [merge -s ours + push], oppure (B) cambiare il default branch su
GitHub con un click. Nessuna eseguita: scelta del founder. Vale la regola: MAI merge di main nel tronco,
MAI squash-merge tronco→main.

### Performance — self-hosting font (sito ~24× più veloce)
Causa di lentezza e di parte dei "blocchi server": Next scaricava i font (Inter + JetBrains Mono) da
Google Fonts a ogni compilazione, ma la rete verso fonts.gstatic.com non è affidabile → timeout ripetuti.
Fix: font self-hostati nel repo (`src/app/fonts/`, licenza SIL OFL). Misurato: GET /it da ~9,4s a ~0,4s.
Nessuna richiesta di rete ai font residua.

### Refactor getOrgData — 3 fonti su 4 rese REALI (era la causa storica di ISSUE-1)
`src/lib/api/financial-query.ts → getOrgData()` leggeva solo financialRecord e SINTETIZZAVA il resto con
formule inventate (causava anche numeri clienti diversi tra pagine). Refactor incrementale con Fable 5,
un passo per volta, ognuno verificato confrontando la dashboard col DB:
- **customers** ← CustomerStat reale. Verificato: dashboard=DB=230 clienti attivi. (Era: parte da 220 + formule.)
- **subscriptions** ← Subscription reale. Verificato: MRR ~27-28k, da dati veri (con cancellazioni). (Era: generati dai ricavi.)
- **cashflow** ← CashflowEntry reale. Verificato: cashAvailable dashboard=DB=435.635 (identico). (Era: coefficienti 0.92/0.94/0.06.)
Contratto d'uscita invariato a ogni passo (nessuna pagina toccata). Fallback onesti per org senza dati
(liste vuote o derivazione 1:1, mai più formule inventate).
- **budget** ← BudgetEntry reale. Verificato: 72 righe, planned/actual con scostamenti realistici
  (non più il finto -5% fisso). ✅ **getOrgData COMPLETO 4/4** — non contiene più dati sintetici, tranne
  UN fallback dichiarato e onesto: il cashflow per org senza CashflowEntry deriva 1:1 dalle transazioni
  (nessun coefficiente inventato). La causa storica di ISSUE-1 è chiusa.
- **RESTA un'invenzione FUORI da getOrgData**: `netProfit = operatingProfit × 0.88` in
  `src/lib/analysis/financial.ts` (groupByMonth) — task separato, non ancora affrontato.← BudgetEntry (oggi mostra un finto -5% fisso). Piano pronto (fallback:
lista vuota, il planned non si inventa). Prossimo passo del refactor.

### Debiti tecnici emersi/confermati (per quando ci sarà calma)
- Decisione su `main` (sopra).
- Formula `netProfit = operatingProfit × 0.88` in `analysis/financial.ts`: altra invenzione, fuori dallo
  scope del refactor getOrgData — task separato.
- `GET /favicon.ico 404`: manca l'icona, cosmetico.
- Per org NON-demo: budget/subscription/cashflow restano vuoti finché non esiste un flusso di import dedicato
  (i fallback definiscono il comportamento onesto nel frattempo).
- Doppioni Prisma (Kpi/KPI, FinancialData/FinancialRecord, AiAlert/AiAlertConfig) ancora da bonificare.

### Nota su Fable 5
Usato in questa sessione per diagnosi profonde (topologia branch, causa lentezza font) E per sviluppo
delicato (refactor getOrgData su codice vivo). Ha più volte corretto imprecisioni dei prompt leggendo il
codice/lo schema reale invece di assumere. È il modello giusto per i problemi difficili; per il lavoro di
routine (pagine, CRUD) resta più efficiente Sonnet.
*Documento di valutazione, non un ordine. Aggiornare quando lo stato reale cambia —
rileggendo il codice, non i vecchi `.md`. La rotta la tiene il fondatore.

---

## 10. Aggiornamento 2026-07-03 — PRODUZIONE: online su Vercel + PostgreSQL

Sessione di deploy. Da qui in poi Anlyra ha un ambiente di PRODUZIONE reale. Cambia tutto: leggere con attenzione.

### ⚠️ REGOLA D'ORO NUOVA — LA PIÙ IMPORTANTE
Il database Supabase è **PRODUZIONE**. Appena ci saranno dati di clienti veri:
**MAI** lanciare seed, reset, `migrate reset`, `deleteMany`, o esperimenti su di esso.
Gli esperimenti si fanno SOLO su un DB di sviluppo separato. Sui dati dei clienti non c'è undo.

### Il sito è ONLINE
- **URL pubblico**: https://anlyra.vercel.app (hosting: Vercel, piano Hobby/free).
- Collegato al repo GitHub, branch `claude/merge-repos-nextjs-rOZU3`. Ogni `git push` → Vercel
  fa un deploy automatico. Il branch di produzione è quello.
- Login demo verificato online: demo@pro.app / DemoAnlyra2026!

### Database migrato: da SQLite a PostgreSQL (Supabase)
- Il progetto NON usa più SQLite. Provider Prisma = `postgresql`. Database su Supabase (region eu-west-1).
- Le vecchie migration SQLite sono archiviate in `prisma/migrations-sqlite-backup/`. La history nuova
  Postgres parte da `20260702225830_init_postgres`.
- Schema Prisma: aggiunto `directUrl = env("DIRECT_URL")` al datasource (serve per le migration via pooler).

### Configurazione connessioni (CRITICA — se sbagliata → 500)
- **DATABASE_URL** (usata dal sito a runtime): pooler porta **6543**, e DEVE finire con
  `?pgbouncer=true&connection_limit=1`. Senza questi parametri → errore 500
  `prepared statement "s1" already exists` (conflitto Prisma + pgBouncer). Questo è stato il bug del primo deploy.
- **DIRECT_URL** (usata solo per le migration): connessione diretta porta **5432**, senza pgbouncer.
- Per il SEED su Postgres (una tantum, in allestimento): va lanciato forzando la porta 5432, es.
  `DATABASE_URL="...5432/postgres" npx prisma db seed` — col pooler 6543 il seed fallisce con prepared statement.

### Variabili d'ambiente su Vercel (Settings → Environment Variables)
Impostate: DATABASE_URL (6543 + pgbouncer), DIRECT_URL (5432), AUTH_SECRET, NEXTAUTH_SECRET,
AUTH_TRUST_HOST=true, CRON_SECRET. NON impostare AUTH_URL/NEXTAUTH_URL (bug 500 storico).
Ancora DA impostare quando serviranno: STRIPE_*, RESEND_*, ANTHROPIC_API_KEY, NEXT_PUBLIC_SITE_URL.

### Modifiche al build per Vercel (package.json)
- `postinstall: prisma generate` (Vercel rigenera il client dopo l'install).
- `build: prisma migrate deploy && next build` (applica le migration a ogni deploy).
- Fix Suspense: login/reset-password/verify-email avvolte in `<Suspense>` (useSearchParams richiede
  Suspense nel build di produzione, altrimenti "prerender-error" e build fallito).

### Come ripartire (Codespace dopo un reset)
Il DB ora vive su Supabase (non si perde col Codespace). In un Codespace nuovo: `npm install`, ricreare `.env`
(DATABASE_URL 6543+pgbouncer, DIRECT_URL 5432, AUTH_SECRET, NEXTAUTH_SECRET, AUTH_TRUST_HOST=true, CRON_SECRET),
`npx prisma generate`, `npm run dev`.

### Sicurezza — DA FARE prima del lancio pubblico vero
- **Cambiare la password del database Supabase**: quella attuale è stata digitata in chat, va rigenerata
  (Supabase → Settings → Database → reset password) e aggiornata in DATABASE_URL/DIRECT_URL su Vercel e nel .env.
- Audit sicurezza (51 punti) ancora da fare.
- 12 vulnerabilità npm segnalate (NON risolte con audit fix --force: rischio rotture — da valutare a mano).

### Debiti già noti che ora contano di più (verso il pubblico)
- Bug integrazioni: `Organization_b12` vuota → integrazioni si romperebbero per org nuove (da fixare prima di Stripe).
- Bug crediti: in Overview "scaduti (6030€) > totale da incassare (3050€)" — incoerenza logica visibile.
- Spese ricorrenti: card a 0€/mese in Overview (da verificare).
- Dati demo troppo ottimisti (ricavi +187%, margine 75%) — poco credibili da mostrare a un cliente.
- Pulizia doppioni Prisma (diagnosi Fable pronta, LOTTO 1 = 9 modelli, richiede backup DB prima).

---

## 11. Aggiornamento 2026-07-04 — sicurezza critica chiusa + credenziali riallineate

### ⚠️ CREDENZIALI — STATO ATTUALE (leggere)
- **Password DATABASE Supabase**: RICAMBIATA (quella vecchia digitata in chat è stata sostituita). Salvata in
  Proton Pass. È allineata in 3 posti: Codespace `.env`, Vercel (DATABASE_URL + DIRECT_URL), Supabase.
  Solo lettere+numeri (i simboli rompevano la stringa di connessione).
- **Password LOGIN utente demo** (sul DB di PRODUZIONE): `DemoAnlyra2026!` (reimpostata via script sul DB prod;
  era diversa da quella locale). Login online verificato: demo@pro.app / DemoAnlyra2026!

### Fix di sicurezza CRITICI C1 + C2 — FATTO, MERGIATO, ONLINE, TESTATO
Dall'audit di sicurezza pre-lancio (§ audit Fable: 2 critici, 4 alti, 3 medi). Risolti i due CRITICI:
- **C1**: eliminata la sessione falsificabile via cookie `pro_session` (era usata dalle route billing → un utente
  poteva impersonare qualsiasi org sul flusso pagamenti). Ora tutto passa da `getAuthContext()` in `src/lib/session.ts`,
  che deriva identità dalla sessione NextAuth reale + verifica Membership. No login → 401.
- **C2**: eliminato `getCurrentOrgId()` che ritornava sempre la prima org del DB. Ora l'org è quella reale dell'utente.
- Eliminati i file insicuri: `src/lib/auth/session.ts` e `src/lib/auth.ts`. Demo-vetrina in sola lettura preservata.
- Fatto da Opus 4.8 (Fable 5 bloccato dai safeguards sui termini di cybersecurity → switch automatico a Opus, normale).
- **Testato in locale (4 test) E in produzione**: login demo ok; senza login → redirect al login su pagine protette. ✅
- Commit mergiato, online su Vercel.

### Sicurezza — cosa RESTA dall'audit (per il lancio pubblico completo)
- **ALTI da fare**: A1 fallback demo su route di scrittura → 401; A2 SSRF in /api/market/scrape; A3 rate limiting
  su login/register/reset; A4 cron fail-closed. (Piani non ancora fatti.)
- **REGOLA D'ORO**: il DB Supabase è PRODUZIONE. Lo script per la password demo di oggi era lecito (allestimento),
  ma appena ci saranno dati di clienti veri: niente più seed/reset/update diretti sul DB prod.

### Idea parcheggiata per la v2 (dopo il lancio)
- **Modalità "Orchestra"**: dare personalità al prodotto — l'AI che "dirige" tutti i dati come un direttore
  d'orchestra. Possibile nome/identità della sezione avanzata (alternativa a "CRM"). Da definire coi clienti veri.
