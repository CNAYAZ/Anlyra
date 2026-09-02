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
>
> **Aggiornato il 2026-08-21**: vedi **§26 in fondo** — rivalutazione completa riletta dal
> codice. La fotografia del §2 è in gran parte SUPERATA (quasi tutti i "pezzi che fingono"
> sono stati sistemati); §26 dice cosa è cambiato, cosa resta vero, e i debiti attuali.
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
---

## 12. Aggiornamento 2026-07-05 — bug crediti + sicurezza A1 completa

### Bug visibili in Overview
- **Crediti "scaduti > totale" RISOLTO**: la card "Crediti da incassare" mostrava solo i non-scaduti (openAmount)
  come totale, con "di cui scaduti" (overdueAmount) più grande — impossibile. Fix: nuovo campo outstandingAmount
  = open + overdue; la card ora mostra il totale non-pagato (~9080), scaduti ~6030 (≤ totale). Solo presentazione,
  nessun cambiamento dati. Mergiato e online.
- **Spese ricorrenti "0€"**: NON è un bug. La tabella è vuota per la demo-org, ed è corretto che un cliente nuovo
  veda 0 finché non inserisce le sue. La demo è solo vetrina illustrativa. Lasciato com'è (deciso dal founder).

### DECISIONE PRODOTTO — natura della demo (importante per la sicurezza)
- La modalità demo è uno strumento ILLUSTRATIVO, accessibile SOLO da utente LOGGATO (dopo il login/acquisto),
  per far vedere come appare il sito pieno di dati. Un utente loggato può interagirci ("parco giochi").
- Un utente REALE vede il suo sito VUOTO (pagine azzerate) da riempire coi suoi dati; NON passa dalla demo.
- Conseguenza sicurezza: "no login → 401" NON rompe la demo, perché chi usa la demo è comunque loggato.

### Sicurezza A1 — COMPLETA (scritture protette)
Dall'audit (dopo C1+C2 già fatti). A1 = "no sessione → demo" era sbagliato sulle scritture: un anonimo poteva
scrivere sulla demo-org. Fix: tutte le route di SCRITTURA di business convertite da getCurrentContext (fallback
demo) a getAuthContext (strict → 401 se non loggato). 28 route totali in 2 lotti:
- Lotto 1: receivables, recurring-expenses (POST/PATCH/DELETE). Testato: 401 senza login, loggato/demo funziona.
- Lotto 2 (resto): ai/alerts, ai/chat, ai/insights, custom-dashboards, data/import, data/manual, integrations
  (connect/disconnect/sync/frequency), reports, settings (profile/organization/notifications). Testato: custom-
  dashboards → 401 senza login; nessuna route dà 200 senza login.
- ESCLUSE di proposito (corrette così): letture vetrina demo (GET), cron trial-check, webhook Stripe (protezione
  a secret/signature), onboarding (l'utente sta creando la sua org, non è ancora membro → non applicabile).
- Tutto mergiato e online su Vercel.

### Sicurezza — cosa RESTA dall'audit
- **2 route AMBIGUE segnalate da Opus, DA VALUTARE** (toccano registrazione/verifica email, zona delicata):
  auth/email-status e auth/precheck (o simili) — Opus le ha lasciate com'erano per non rischiare di rompere il
  flusso di registrazione. Da guardare con attenzione prima di decidere.
- **A2** SSRF in /api/market/scrape (autenticare + bloccare IP interni/metadata).
- **A3** Rate limiting su login/register/reset (anti brute-force) — importante prima di aprire registrazioni pubbliche.
- **A4** Cron fail-closed (CRON_SECRET obbligatorio in prod).
- MEDI: header di sicurezza (CSP/HSTS), endpoint mock (onboarding random id, reports/generate sample).

### Nota infrastruttura
- Codespace attuale: `congenial-waddle-...` (ricreato). Il proxy 404 sul browser del Codespace resta capriccioso;
  workaround: testare le API via curl da terminale (funziona sempre) e la verifica visiva su Vercel (stabile).
  Il DB di prod (Supabase) NON dipende dal Codespace.
  ---

## 13. Aggiornamento 2026-07-06 — A3 rate limiting COMPLETO (step 1) + scoperta trappola Production Branch

### A3 — Rate limiting su login: FATTO e FUNZIONANTE in produzione
- Scelta: Upstash Redis (gratis) + @upstash/ratelimit. Store condiviso, adatto a Vercel serverless.
- Account Upstash creato: DB Redis "anlyra-ratelimit". Env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
  (in .env.local locale e su Vercel Production). @upstash/ratelimit installato.
- Helper nuovo: src/lib/rate-limit.ts (client Redis lazy, sliding window, checkRateLimit(action,identifier),
  getClientIp, fail-OPEN: se Upstash è irraggiungibile → consente + warn, non blocca i login).
- Applicato a /api/auth/precheck (login): 10/IP/10min E 5/email/15min. Testato in locale E in produzione:
  primi 5 tentativi 200, dal 6° → 429 (scatta il limite per-email). ✅
- Le soglie delle ALTRE route auth (register, forgot, reset, email-status, 2fa) sono già definite in rate-limit.ts
  ma NON ancora applicate: è lo STEP 2 di A3 (da fare — ripetere il pattern sulle altre route).

### ⚠️ SCOPERTA CRITICA — la "trappola del Production Branch" (causa di misteri da giorni)
- Vercel aveva il Production Branch impostato su `main`, MA noi lavoriamo/pushiamo su
  `claude/merge-repos-nextjs-rOZU3`. Risultato: da GIORNI Vercel serviva in produzione una versione VECCHIA
  (ferma al fix Suspense), e TUTTI i push nuovi finivano in deploy "Preview" invisibili.
- CONSEGUENZA: il fix crediti, C1, C2, A1, A4 erano nel codice/GitHub ma NON in produzione. Spiega perché
  "la cifra crediti non si aggiornava" e perché i fix sembravano non fare effetto online.
- FIX APPLICATO: Vercel → Settings → Environments → Production → Branch Tracking cambiato da `main` a
  `claude/merge-repos-nextjs-rOZU3`. Ora ogni push va in produzione. TUTTO il lavoro arretrato è andato online insieme.
- TODO futuro (quando il limite settimanale lo permette): valutare di allineare `main` al branch di lavoro
  (mergiare) e rimettere `main` come Production Branch, per pulizia/standard. Per ora si resta così.
- LEZIONE: quando si pusha, verificare che il deploy Vercel sia "Production" (non "Preview") e col commit giusto.

### LEZIONE — env su Vercel: solo il VALORE, mai il blocco intero
- Il pulsante "copia" di Upstash copia l'INTERO blocco .env (NOME="valore" per entrambe le variabili).
- Incollato tutto in un solo campo Value → token invalido ("invalid header value" / "whitespace"). 
- CORRETTO: nel campo Key va solo il nome; nel campo Value va SOLO il valore NUDO, senza virgolette e senza spazi.
  (Verifica tokenLength: col contorno era 89/152, pulito è ~62.)

### Stato sicurezza (tutto ora ONLINE in produzione)
- ✅ C1, C2 (critici), ✅ A1 (scritture protette), ✅ A4 (cron fail-closed), ✅ A3 step1 (rate limit login).
- RESTA: A3 step2 (rate limit sulle altre route auth), A2 (SSRF /api/market/scrape), 2 route ambigue
  (auth/email-status, precheck — da valutare), MEDI (header sicurezza CSP/HSTS, endpoint mock).
- Endpoint diagnostico temporaneo /api/debug/ratelimit-check: creato per diagnosi, poi RIMOSSO (404 confermato).
---
## 14. Aggiornamento 2026-07-09 — SICUREZZA AUDIT COMPLETA
- A3 step2: rate limit su register/forgot/reset/email-status/2fa. Fatto, online.
- A2: endpoint SSRF /api/market/scrape disattivato (410) + scraper.ts eliminato. Era codice morto.
- Header sicurezza L1 (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy) in next.config. NIENTE CSP (rimandata, rischio rottura Stripe).
- rate limit su reports/generate (anti-DoS PDF, no auth per la share pubblica).
- Rimossi 2 endpoint mock orfani: /api/onboarding (mock) e /api/upload. NB: /api/onboarding/organization (reale) resta.
- Login core (src/auth.ts): rate limit per-email in authorize() → chiude il bypass brute-force di precheck (stesso contatore login-email). Testato: login demo entra OK, blocco dopo 5 tentativi.
- getClientIp: preferisce x-real-ip (anti-spoofing XFF).
- STATO: C1,C2,A1,A2,A3,A4 + medi = CHIUSI e online. RRIMANDATI post-lancio: CSP piena (report-only prima), normalizzazione email-status (già rate-limited), origin fisso billing (B2), riattivare ignoreBuildErrors.
- PROSSIMO: Stripe/pagamenti (serve prima fixare bug integrazioni Organization_b12 vuota). Poi chiavi AI.
---
## 15. Aggiornamento 2026-07-11 — persistenza billing (pre-Stripe)
- Bug scoperto: repository billing era in-memory (Map RAM) → su Vercel i dati svanivano. Un pagamento Stripe non si sarebbe mai salvato.
- STEP 1: 3 tabelle Prisma create (BillingSubscription, BillingInvoice, CreditEntry). Già nel DB prod (applicate) + schema. FK gestite a livello app (no vincolo → nessun rischio doppione _b12).
- STEP 2: repository.ts riscritto su Prisma (stesse firme → webhook/route billing non toccati). Testato: dato persiste nel DB e si rilegge. Organization.aiCredits = saldo; CreditEntry = storico.
- Backup DB fatto (pg_dump, ~/anlyra-backup-20260710). Solo nel Codespace (effimero).
- PROSSIMO: Stripe vero (checkout+webhook+chiavi). Serve: 1) decidere piani/prezzi (schema prevede PRO/ADVANCED/ENTERPRISE, mensile/annuale); 2) account Stripe + chiavi.
- Bug integrazioni Organization_b12: ANCORA da fixare (indipendente dal billing). 
- Serata networking 10/07: 15 contatti, lead caldi Alberto (artigiano, vuole gestione stock/automazione — non pronto in Anlyra) e Martina (nuova attività, vuole marketing/promozione dai dati → chatbot AI, priorità 1). Chatbot serve chiavi API Anthropic (non ancora prese).
---
## 16. Aggiornamento 2026-07-12 — STRIPE CHECKOUT FUNZIONANTE (test mode)
Scadenza rilanciata: lancio pubblico + pagamenti entro 14/07.
- Account Stripe creato (TEST mode). Libreria stripe installata, client condiviso.
- Env (in .env.local + Vercel): STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO (49€ test), STRIPE_PRICE_ADVANCED_MONTHLY (99€ test).
- Webhook Stripe configurato su https://anlyra.vercel.app/api/webhooks/stripe (4 eventi: checkout.session.completed, customer.subscription.updated/deleted, invoice.paid).
- Checkout end-to-end TESTATO e FUNZIONANTE: bottone → Stripe Checkout → pagamento carta test 4242 → webhook → DB salva subscription (ADVANCED active, stripeCustomerId/stripeSubscriptionId popolati).
- Fix UI: bottoni CTA pagina billing attiva ((dashboard)/settings/billing/page.tsx) erano decorativi (no onClick) → collegati al checkout.
- Fix piano: BillingProvider non era mai montato → UI mostrava sempre "PRO" default. Ora legge il piano REALE dal DB via getAuthContext+repository nel layout dashboard. Verificato: mostra ADVANCED.
- Convenzione env prezzi (src/lib/stripe/prices.ts): STRIPE_PRICE_<PLAN>_MONTHLY / _YEARLY. PRO ha fallback su STRIPE_PRICE_PRO.

### DA FARE prima del 14/07 (lancio)
- Testare portale cliente (billing/portal — cancellazione/gestione abbonamento).
- currentPeriodEnd resta null dopo checkout → data rinnovo non popolata (da fixare, minore).
- Testare anche il flusso PRO (finora testato ADVANCED).
- Decidere PREZZI VERI (ora test 49/99) + eventuali piani yearly + ENTERPRISE (contact).
- Traduzioni mancanti: pricing.plans.enterprise.priceMonthly/priceAnnual (it) — MISSING_MESSAGE in console.
- Passare Stripe da TEST a LIVE (nuove chiavi live, nuovo webhook, dati aziendali/IBAN per incassare) — richiede struttura fiscale.
- Bug integrazioni Organization_b12 (indipendente, ancora aperto).
- Chiavi API Anthropic per chatbot (lead Martina) — non ancora prese.
---
## 17. Aggiornamento 2026-07-12 (sera) — billing rifinito, quasi pronto al lancio
- Portale cliente Stripe: bottone "Gestisci Abbonamento" aggiunto alla pagina billing attiva → apre Customer Portal (attivato su Stripe). Testato: disdetta funziona (cancelAtPeriodEnd via webhook).
- currentPeriodEnd: fix webhook (recupera la data dalla subscription Stripe). Testato: si popola (es. 2026-08-12). UI mostra "Rinnova il...".
- PREZZI VERI allineati (erano definitivi da sessione vecchia): PRO 49/mese 490/anno, ADVANCED 149/mese 1490/anno, ENTERPRISE custom. Creati su Stripe 2 prodotti separati (Anlyra PRO, Anlyra ADVANCED) con prezzi mensile+annuale. Vecchi price id di test eliminati (pulizia). 4 variabili STRIPE_PRICE_<PLAN>_<MONTHLY|YEARLY> in .env.local + Vercel.
- Fix UI badge "Corrente": ora considera piano E ciclo (prima ADVANCED annuale risultava "corrente" anche per chi aveva il mensile). cycle propagato nel billing context. Verificato: DB salva cycle giusto (monthly), era solo problema UI.
- Testato: checkout PRO e ADVANCED, mensile e annuale, prezzi giusti sul checkout Stripe. Cambio piano non lascia doppioni (vecchia sub disattivata).
- STRATEGIA COMMERCIALE founder: puntare su abbonamenti lunghi (annuali / min 3 mesi) perché l'AI dà valore col tempo; focus su retention post-vendita.

### DA FARE prima del lancio
- Traduzioni enterprise mancanti (pricing.plans.enterprise.priceMonthly/priceAnnual) — MISSING_MESSAGE console.
- Ritorno automatico dal portale Stripe (cosmetico).
- Bug integrazioni Organization_b12 (indipendente, ancora aperto).
- Passaggio Stripe TEST→LIVE: chiavi live, webhook live, dati fiscali/IBAN per incassare. Test previsto con carta usa-e-getta poi rimborso.
- Chiavi API Anthropic per chatbot marketing (lead Martina).
---
## 18. Aggiornamento 2026-07-12 (notte) — bug integrazioni chiuso + email/dominio in corso
- Bug Organization_b12 RISOLTO: Integration FK ora punta a Organization vera, doppione Organization_b12 eliminato (era vuoto). Verificato sul DB: Organization_b12 non esiste più, FK Integration→Organization. Le integrazioni ora funzionano per le org reali (prima davano P2003). Backup DB fresco fatto prima (anlyra-backup-pre-integrations-*).
- EMAIL (Resend): scoperto che le mail di verifica NON partivano → manca RESEND_API_KEY (sistema email era disattivato). Codice email OK (usa Resend, src/lib/email/). Chiave presa, messa in .env.local. Test invio RIMANDATO (serviva email personale → founder giustamente non l'ha fornita per OpSec). Scelto dominio vero (B) per il mittente.
- DOMINIO: anlyra.it da comprare/configurare. Founder valuta provider (GoDaddy/Hostinger/Vercel/Cloudflare) con calma. Serve per: mittente email noreply@anlyra.it (DNS su Resend) + sito. RIMANDATO.
- P.IVA: founder la sta aprendo con Fiscozen (consulenza fissata). Serve per Stripe LIVE (incassare). Descrizione attività per ATECO: SaaS consulenza/analisi finanziaria AI per PMI, abbonamento ricorrente.

### DA FARE prima del lancio (14/07 o quando pronti)
- EMAIL: comprare/configurare dominio anlyra.it → verificarlo su Resend (DNS) → RESEND_FROM=noreply@anlyra.it → testare registrazione end-to-end. BLOCCANTE per registrazioni clienti.
- Stripe TEST→LIVE (dopo P.IVA): chiavi live, prodotti/prezzi live, webhook live, dati fiscali/IBAN.
- Ritorno automatico dal portale Stripe (cosmetico).
- Messaggi WhatsApp follow-up lead Martina (chatbot marketing, priorità 1) e Alberto (automazione stock, priorità 2).
- Chatbot marketing per Martina: serve chiave API Anthropic (non ancora presa).
---
## 19. Aggiornamento 2026-07-16/17 — AI live, dominio .com, email funzionanti, falla multi-tenant chiusa

### AI (agente business completo)
- ANTHROPIC_API_KEY presa (account API a consumo, 5€ caricati) — in .env.local + Vercel.
- Modello: claude-sonnet-5 (il vecchio claude-sonnet-4-20250514 era obsoleto). ANTHROPIC_MODEL override via env. ATTENZIONE: Sonnet 5 RIFIUTA `temperature` (400) → rimosso da chatComplete. ANTHROPIC_MAX_TOKENS 2048→4096 (le analisi si troncavano).
- Route unica POST /api/ai/analyze con mappa type→builder: financial, marketing, kpi, competitor, chat. getAuthContext strict + rate limit 'ai-analyze' (20/10min IP+org). Prompt specializzati in src/lib/ai/prompts/*.ts (profondità adattiva se pochi dati, paletti business-only, no consulenza fiscale/legale, no disclaimer nel testo).
- Testati via script tsx: output di alta qualità su 3 domini (finanziario/marketing/KPI). Costo ~1 cent/analisi.
- LA ROUTE analyze È ORFANA: nessuna UI la chiama (la chat del sito usa ancora la vecchia /api/ai/chat). DA COLLEGARE.

### Dominio + email
- Comprato **anlyra.com** su Hostinger (16€ primo anno, ~21€ rinnovo). NIENTE .it per ora. Codice allineato .it→.com (mittente noreply@anlyra.com, contatti contact@anlyra.com, URL fallback https://anlyra.com).
- Casella **contact@anlyra.com** (Hostinger, presa 1 mese, da rinnovare).
- DNS su Hostinger: record A @ → 216.198.79.1 (Vercel), rimosso il vecchio A 2.57.91.91. NON toccare MX/SPF/DKIM hostinger (servono per contact@).
- Resend: dominio anlyra.com VERIFICATO (3 record: DKIM resend._domainkey, TXT send, MX send). RESEND_FROM="Anlyra <noreply@anlyra.com>" in .env.local + Vercel. Test invio → arrivata su contact@. FUNZIONA.
- NEXT_PUBLIC_SITE_URL=https://anlyra.com su Vercel (mancava → i link di verifica puntavano a localhost:3000). Fix in siteUrl(): .trim() su tutti gli env URL (uno spazio nel valore generava anlyra.com%20 → DNS error).

### FALLA SICUREZZA MULTI-TENANT CHIUSA (era grave)
- Un utente nuovo loggato senza organizzazione riceveva il contesto DEMO (userId demo + demo-org): vedeva e poteva scrivere nel tenant demo.
- Causa: getCurrentContext() non distingueva "anonimo" da "loggato senza org" → entrambi → getDemoContext().
- Fix: resolveSessionContext tipizzato a 3 stati (anonymous | no-org | ok). Demo SOLO per anonimo (vetrina). no-org → throw NoOrganizationError. Layout (dashboard) → redirect a /onboarding. getAuthContext NON toccata (era già corretta). ~25 caller di getCurrentContext invariati.

### Onboarding (era un guscio vuoto)
- Il form NON creava nulla: handleFinish faceva solo completeOnboarding() (store client mock) + router.push('/dashboard') → 404 ('(dashboard)' è un route group, l'URL reale è /overview).
- Fix: chiama POST /api/onboarding/organization con {name, industry, teamSize}, busy anti-doppio-click, errore gestito, redirect /overview. Bottone "skip" RIMOSSO (senza org = loop).
- VERIFICATO IN PROD: utente nuovo → org propria + Membership admin → /overview con dati vuoti. Flusso registrazione COMPLETO end-to-end.

### P.IVA / vendita
- Fiscozen: 59€/mese, gestiscono tutto (commercialista + app fatturazione). Seconda call da fissare.
- **VINCOLO: la Camera di Commercio richiede 14-20 giorni per il via ufficiale** → non si può incassare prima.
- [DECISION founder] Niente trial a pagamento nel frattempo: accesso gratuito manuale ai primi utenti (tester), pagamenti attivati quando arriva il via. Zero rischi legali.

### DEBITI NOTI (follow-up)
- Route /api/onboarding/organization NON idempotente: un secondo POST crea una SECONDA org (mitigato lato UI con busy, ma va sistemato).
- Onboarding: country/currency compilati dall'utente ma NON salvati (la route non li accetta); website/logoUrl non esistono proprio nello schema.
- Loggato-senza-org che colpisce direttamente un'API → 500 (non è un leak, ma dovrebbe essere 401).
- La route analyze non scala i crediti utente (lo fa solo la chat legacy).
- Vecchi utenti di test nel DB (temp-mail) + org "Demo User"/"Michl" da ripulire prima del lancio.

### PROSSIMI PASSI
1. Collegare le 5 modalità AI a un'interfaccia (oggi orfane).
2. Streaming risposte + stati ("sta analizzando..."), interfaccia chat migliore, disclaimer "Anlyra è un'AI, può commettere errori, verifica le risposte" (requisito founder).
3. Messaggi WhatsApp Martina (candele, Nocte Candle Lab — chatbot marketing) e Alberto.
4. Stripe TEST→LIVE quando arriva il via della Camera di Commercio.
5. Cambiare password DB Supabase prima del lancio.
---
## 20. Aggiornamento 2026-07-18 — billing trial onesto + strategia lancio "lista d'attesa"

### Fix: niente più PRO fasullo
- defaultSubscription() non regala più "PRO active +30gg" alle org senza subscription. Ora deriva dallo stato reale: trial attivo (trialEndsAt futuro) → status "trialing" + scadenza vera dal DB; trial scaduto/assente → status "canceled" + data reale. Rimosso DEV_DEFAULT_PLAN. Chi ha una BillingSubscription reale: invariato.
- LIMITE NOTO (Opus si è fermato, serve decisione): il gating è PLAN-only, ignora lo status → un trial SCADUTO mostra "canceled" ma ha ancora le feature PRO (non bloccate). Da chiudere quando si attiveranno i pagamenti. Opzione consigliata: blocco lato server sugli endpoint sensibili quando status ∉ {active, trialing} (opzione C di Opus). NON urgente ora (nessun trial scade prima del via Camera di Commercio).
- STARTER (Organization.plan default nello schema) non è un piano vendibile: defaultSubscription non lo usa mai come piano attivo (restituisce sempre un PlanId valido). Riconciliato senza migration.

### [DECISION founder] Strategia lancio: LISTA D'ATTESA (non far entrare ancora nessuno)
- Finché la Camera di Commercio non dà il via (14-20 gg) NON si può incassare. Invece di dare accesso gratuito e bruciare giorni di trial, si raccolgono gli interessati e si dice "siamo in fase burocratica, ti avvisiamo appena apriamo".
- Nei messaggi a Martina/Alberto: NON promettere accesso immediato; dire che apriremo a breve e li avviseremo. Zero giorni gratis regalati, pagamenti già live quando apriamo.
- Quindi: NIENTE modifica a TRIAL_DAYS ora, niente accesso anticipato da gestire. Trial resta 7gg (default route onboarding).

### Registrazione end-to-end VERIFICATA in prod (incognito)
- registrazione → email verifica da noreply@anlyra.com → click link (https://anlyra.com, no più localhost) → login → onboarding (5 step) → crea org propria + Membership admin + trial 7gg → /overview con dati vuoti (NON demo). Isolamento tenant OK.
- Verifica email FUNZIONA (utente kopahe8267 risulta emailVerified). 

### DEBITI NOTI aggiornati
- Gating status-aware (blocco feature a trial scaduto) — da fare con pagamenti live.
- Route onboarding NON idempotente (2° POST = 2ª org). country/currency compilati ma non salvati; website/logoUrl non nello schema.
- getMonthlyUsage() ritorna placeholder a zero (usage non reale).
- Loggato-senza-org su API diretta → 500 invece di 401.
- Route AI analyze orfana (nessuna UI) + non scala crediti.
- DB da ripulire: utenti temp-mail di test + org "Michl"/"Demo User".
- Cambiare password DB Supabase prima del lancio.
---
## 21. Aggiornamento 2026-07-18 (sera) — Agente AI usabile in-app + marketing operativo

### Interfaccia agente AI (le 5 modalità ora sono USABILI, non più orfane)
- Pagina /ai/agent ricostruita (era guscio decorativo): src/components/ai-agent/AgentClient.tsx + AnalysisMarkdown.tsx. 5 tab (Finanziaria/Marketing/KPI/Competitor/Chat), bottone "Genera analisi" + campo domanda libera, chiama POST /api/ai/analyze. Rendering markdown con react-markdown + remark-gfm (tabelle GFM rese bene). Disclaimer sempre visibile ("Anlyra è un'AI, può commettere errori, verifica"). Stati loading/errore per status (429/503/generico), anti doppio-invio. Chat = solo campo domanda (no "genera analisi").
- FeatureGate ai_agent RIMOSSO dalla pagina (fase test: accessibile a ogni utente loggato). Protezione resta lato server (getAuthContext + rate limit). Da rimettere quando si definiscono i piani.
- Testato in prod: funziona, analisi formattata, costo ~3 cent/analisi completa.
- Nav: "Agent" promosso a voce top-level della sidebar (era sotto-voce di AI). AI conserva chat/insights/forecasting/benchmarks/alerts.
- Dipendenze nuove: react-markdown ^10, remark-gfm ^4.

### Prompt: "corsie nette" per non sovrapporsi
- Problema rilevato usando l'app: le modalità dicevano cose simili in modo diverso (stessi dati, prompt simili).
- Soluzione: corsie distinte. financial=soldi (no clienti/marketing); kpi=metriche vs target (no strategia); marketing=crescita operativa; competitor=concorrenti; chat=libera.
- MARKETING RIFATTO (validato in test): ora produce 4 aree concrete — 1) Campagne Ads (targeting/messaggi/creatività), 2) Canali & Budget (ripartizione), 3) Contenuti & Promozioni, 4) Posizionamento vs competitor. Onesto sui dati mancanti (vede spesa ads dai pagamenti ma NON performance campagne → dà idee, non numeri inventati). Non scivola più nell'analisi commerciale generica.
- DA FARE: applicare le "corsie nette" anche a financial, kpi, competitor (una per una, come il marketing). Chat resta libera.

### Idea futura (segnalata, NON ora)
- Integrazione Google Ads / Meta Ads (API) per avere le performance reali delle campagne. Cantiere serio (OAuth, mantenimento). Rimandato: nessun cliente l'ha chiesto, i primi lead (Martina candele, Alberto artigiano) probabilmente non hanno campagne strutturate. Va nella sezione Integrazioni quando servirà.

### Messaggio Martina INVIATO
- WhatsApp mandato: riaggancio + "siamo in fase burocratica, ti avviso appena apriamo" (lista d'attesa, no accesso immediato). In attesa di risposta.
- Alberto: hobbista (braccialetti/collane a mano) → lead debole, Anlyra sovradimensionata. Deciso di NON forzare, concentrarsi su Martina.

### DEBITI/FOLLOW-UP aggiornati
- Analisi generate si perdono cambiando tab (voluto, ma scomodo): valutare cache in-memory dei risultati per tab.
- UI agent funziona ma "non piace" al founder → design da rifare.
- Streaming risposte AI: ancora da fare (era nei piani, rimandato dopo la UI base).
- Prompt financial/kpi/competitor da rifare con le corsie nette.
---
## 22. Aggiornamento 2026-07-19 — "corsie nette" complete su tutte le modalità di analisi

Rifatti e validati (test tsx su demo-org) tutti e 4 i prompt di analisi, ognuno con corsia distinta per non sovrapporsi. Chat resta libera.

- FINANCIAL (src/lib/ai/prompts/financial.ts): 4 aree — salute finanziaria (margini/redditività), cashflow & liquidità (runway approssimato, onesto sul fatto che è aggregato non bancario), taglio costi/sprechi (ragiona sugli aggregati se non disaggregati), proiezioni (per estrapolazione trend, dichiarata). Taglio mix analitico+pratico. Competitor rimossi dal data object per rinforzare la corsia.
- MARKETING (marketing.ts): 4 aree — campagne ads (targeting/messaggi/creatività), canali & budget, contenuti & promozioni, posizionamento. Onesto: vede spesa ads ma non performance campagne → dà idee non numeri inventati.
- KPI (kpi.ts): tabella metrica/valore/target/stato come cuore (semaforo 🟢🟡🔴 che RISPETTA il verso della metrica — churn/CAC bassi=meglio), focus critiche + perché, azioni prioritizzate, legami tra metriche (churn→LTV, conversion→CAC).
- COMPETITOR (competitor.ts): 4 aree — quadro concorrenti, come sei messo tu vs loro, minacce & opportunità, come differenziarti. Usa la conoscenza di settore per arricchire MA marca sempre le ipotesi ("in generale…", "da verificare") distinguendole dai dati inseriti; NON inventa prezzi/funzioni dei competitor reali.

Distinzione fine competitor vs marketing: competitor = analisi strategica dei concorrenti; marketing = posizionamento come messaggio/campagna. Dichiarata nei paletti di entrambi.

Costo per analisi completa: ~2-3 cent. Tutte testate su demo-org con output di alta qualità.

### Stato prodotto
Il prodotto è LANCIABILE appena arriva il via della Camera di Commercio. Flusso registrazione→onboarding→dashboard isolata funziona end-to-end. Agente AI usabile in-app con 4 corsie distinte + chat. Email e dominio funzionanti. Pagamenti pronti (test).

### PROSSIMI PASSI (nessuno bloccante)
- Streaming risposte AI (parola per parola + stati "sta analizzando").
- Design/UI pagina agent (funziona ma non piace al founder).
- Analisi che si perdono cambiando tab → cache in-memory per tab.
- Gating status-aware (bloccare feature a trial scaduto) — quando pagamenti live.
- Stripe TEST→LIVE quando arriva il via Camera di Commercio.
- Pulizia DB (utenti temp-mail di test, org Michl/Demo User) + cambio password DB Supabase.
- Rispondere a Martina quando risponde.
---
## 23. Aggiornamento 2026-07-19 (sera) — memoria tab + streaming AI + TestSprite

### Agente AI — due migliorie
- MEMORIA PER-TAB (AgentClient.tsx): ogni modalità ricorda result/question/error/loading durante la sessione. Cambiando tab non si perde più il risultato (niente rigenerazione = niente spreco ~3 cent). Loading per-tab: puoi lanciare un'analisi, cambiare tab, e trovarla pronta al ritorno (spinner inline sul tab in background). Solo in-sessione: si azzera al reload (voluto). Cronologia persistente nel DB = cantiere futuro (segnata, non fatta).
- STREAMING (client.ts + route analyze + AgentClient.tsx): le risposte appaiono progressivamente (token per token) con cursore pulsante. Implementato SENZA rompere nulla: chatComplete invariata; aggiunta chatStream (async generator); la route streamma solo con flag opt-in `stream:true` nel body, altrimenti risponde JSON come prima (script e altri chiamanti non rotti). Errori 401/429/400/503/500 decisi PRIMA di aprire lo stream (restano JSON con status giusto). Tabelle markdown: react-markdown regge il parziale, si assestano a fine stream. SDK @anthropic-ai/sdk 0.32.1, client.messages.stream(). Testato in browser: fluido.

### TestSprite (tool di test esterno)
- Provato TestSprite (1 mese gratis) sul sito pubblico anlyra.com/vercel: 9 test UI (home, pricing, navigazione, login demo) tutti PASS. Sono test di SUPERFICIE (landing + login demo), NON coprono registrazione/onboarding/isolamento tenant/AI. Utili come sanity check, non come audit vero.
- Esiste opzione MCP per far analizzare il CODICE (claude mcp add TestSprite). NON collegato: valutare più avanti se serve (rischio: molte segnalazioni/falsi positivi mentre il codice cambia). Se collegato: accesso repo sola-lettura, MAI .env/Vercel, filtrare i risultati insieme prima di agire.
- ATTENZIONE per test futuri su produzione: un tool che clicca "Genera analisi" sull'agent brucia crediti Anthropic reali (~3 cent/click); il rate limit 20/10min protegge in parte. E crea dati di test nel DB prod (da ripulire).

### Stato prodotto
Agente AI completo e rifinito: 4 corsie distinte + chat, memoria per-tab, streaming. Cuore del prodotto solido. Resta: design pagina agent (non piace al founder), pulizia DB pre-lancio, cambio password Supabase, gating trial scaduto (a pagamenti live). Nessuno bloccante — lancio dipende da Camera di Commercio.
### Pulizia DB pre-lancio FATTA (19/07)
Rimossi 11 utenti temp-mail di test + 4 org spazzatura (Demo User x2, Michl, Test 1). Rimasti: demo-org (Acme Analytics) + demo@pro.app + 2 Gmail reali (merthakkitakak@, mikailipek225@) da tenere. DB pulito per i clienti veri. Script cleanup usato e non committato.

### UI agent — refresh estetico FATTO
Pagina agent ridisegnata coerente con lo stile dell'app (tile-icona sage, segmented control per le 5 tab con icone, risultato come "report", stati curati). Logica intatta. Approvato dal founder.

## 24. Aggiornamento 2026-07-20 — gating trial scaduto FATTO

Chiuso il limite noto (gating era plan-only, ignorava lo status → trial scaduto aveva ancora feature PRO).
- Nuova helper requireActiveAccess(orgId) in src/lib/billing/server-gate.ts: allowed = status ∈ {active,trialing}.
- Blocco server-side (402 TRIAL_EXPIRED) PRIMA di chiamare l'AI/scrivere, su: ai/analyze, ai/chat, ai/alerts/[id]/analyze (tutte le vie AI che consumano crediti) + data/manual, data/import/commit, receivables POST, recurring-expenses POST (scritture).
- Ricognizione utile: la maggior parte degli "endpoint AI" del menu NON chiama l'AI (insights/generate è stub; benchmarks/forecasting/insights sono GET; alerts/check|refresh sono a regole; reports/generate è PDF su sample). Bloccati solo i 3 che consumano crediti davvero.
- A trial scaduto: dashboard e dati VISIBILI in sola lettura, niente si cancella; AI e scrittura bloccate con messaggio "abbonati per continuare" (UI agent). active/trialing INVARIATI (verificato: demo-org ADVANCED = active, org senza sub = canceled).
- Follow-up NON urgente: messaggio dedicato TRIAL_EXPIRED nella UI import (ora generico) + banner dashboard "prova scaduta". Il blocco server funziona già; è solo cosmetica.

### Contesto esterno (20/07)
- P.IVA: pagata oggi, oggi parte il processo Camera di Commercio (14-20 gg per il via → poi Stripe LIVE).
- Martina: non ha (ancora) risposto al WhatsApp. Non insistere; riagganciare quando si apre davvero (notizia concreta).

## 25. Aggiornamento 2026-07-20 — UI trial scaduto (banner + messaggio import)
- TrialExpiredBanner (src/components/billing/TrialExpiredBanner.tsx): striscia in alto nella dashboard (sotto Topbar), appare SOLO se status non in {active,trialing}. Testo + bottone "Abbonati" → /settings/billing (locale-aware). Non copre i dati (border-b che spinge il contenuto giù, non overlay). Legge useBilling().state.status.
- Pagina import: il 402 TRIAL_EXPIRED ora mostra messaggio dedicato invece del codice grezzo.
- Verificato: demo (active) NON mostra il banner e non è bloccata. Logica confermata: org senza subscription = canceled = banner+blocco.
- Nota terminale: bash espande '!!' come history (→ inserisce l'ultimo comando negli script inline). Evitare '!' nei comandi inline; usare Boolean() non '!!', e preferire script su file dentro il progetto.

### Gating trial scaduto: COMPLETO end-to-end
Server (402 su AI+scritture) + UI (banner dashboard + messaggio import). Il "buco" del PRO regalato a vita è chiuso in ogni aspetto. Follow-up minori possibili (bloccare anche endpoint di scrittura secondari: receivables/recurring PATCH-DELETE, custom-dashboards, reports) ma non critici.

---
---

## 26. Aggiornamento 2026-08-21 — rivalutazione completa, riletta dal codice

> **Cos'è questa sezione.** Non un diario di sessione: una **nuova fotografia intera**,
> come il §2 originale, scritta rileggendo il codice al commit `b105be7` sul branch
> `claude/merge-repos-nextjs-rOZU3`. Il documento era fermo al §25 (2026-07-20); nel
> mese successivo sono successe molte cose, incluse alcune brutte (un incidente di
> cherry-pick che ha cancellato traduzioni, poi riparato). Qui c'è cosa è vero ADESSO.
>
> **Nota di onestà.** Chi scrive lavora in un **container remoto** (`CODESPACE_NAME`
> vuoto): ha riletto il codice e fatto girare `tsc` (0 errori, verificato), ma **non ha
> visto il sito girare nel browser né interrogato il DB di produzione**. Ogni
> affermazione qui sotto è marcata: *(verificato su file:riga)* = letta nel codice ora;
> *(riportato)* = dichiarata dai §14-25 o dal CLAUDE.md ma non ricontrollabile da qui
> (runtime, Vercel, DB, Stripe). Regola d'oro n.2: prima di agire, verifica sulla fonte.

### 26.1 Cosa del vecchio documento è SUPERATO

La lista dei "pezzi che fingono di funzionare" del §2 è quasi tutta risolta:

- **Cambio password**: REALE. `POST /api/auth/change-password` verifica la vecchia
  password, applica la policy e salva l'hash bcrypt (verificato su
  `src/app/api/auth/change-password/route.ts:36,49-52`). Debito residuo: **non invalida
  le sessioni JWT esistenti** — chi era loggato altrove resta loggato (verificato:
  nessuna logica di session-invalidation nella route).
- **Condivisione report**: REALE e validata dal server. Il token è generato lato server
  con `crypto.randomBytes(32)`, salvato su `Report_b8` con scadenza
  (`SHARE_LINK_TTL_DAYS`), e la pagina pubblica legge da `/api/share/[token]` — non più
  dal localStorage del browser di chi condivide (verificato su
  `src/app/api/reports/[id]/share/route.ts:46-50` e
  `src/app/[locale]/share/[token]/page.tsx:54`). Solo owner/admin possono creare il
  link (`requireManagerRole`).
- **"Run now" dei report**: ora fa un PDF VERO. `POST /api/reports/[id]` chiama
  `renderReportPdf` che costruisce i dati da Prisma (`src/lib/reports/real-data.ts`) e
  il client lo scarica come file (verificato su
  `src/app/api/reports/[id]/route.ts:85-94` e
  `src/app/[locale]/(dashboard)/reports/page.tsx:42-60`). Le sezioni che non si possono
  riempire con dati veri vengono ESCLUSE invece che riempite di numeri plausibili
  (`real-data.ts:174-196`) — scelta onesta, ma vedi debito in 26.4.
- **Finta sync Stripe**: neutralizzata. Il provider dati-Stripe è ora uno stub onesto
  che non scrive nulla e fallisce dichiaratamente — prima fabbricava FinancialRecord con
  `Math.random()` (verificato su `src/lib/sync/providers/stripe.ts:12`). Il connect
  delle integrazioni risponde 503 "Integration not available yet"
  (`src/app/api/integrations/[provider]/connect/route.ts:26`).
- **`netProfit = operatingProfit × 0.88`** (l'invenzione segnalata al §9): SPARITA —
  grep su `0.88` in `src/lib/analysis/financial.ts` non trova nulla (verificato).
- **Bug Organization_b12** (integrazioni rotte per org nuove): risolto al §18, e la FK
  di Integration punta a Organization vera (riportato §18; coerente con lo schema letto).

Restano VERI del vecchio documento:

- **"Genera insight" è ancora uno stub 503**: la route esiste, controlla crediti e
  configurazione ma finisce sempre in `fail('AI_DISABLED_IN_DEMO', 503)` (verificato su
  `src/app/api/ai/insights/generate/route.ts:29`). Il bottone è nascosto dalla UI, quindi
  nessun utente lo vede — ma la generazione insight NON esiste.
- **Operations e Mercato restano motori sintetici**, a riposo: le voci di menu sono
  commentate con nota datata (verificato su `src/components/dashboard/nav-config.ts:71-98`),
  i motori seno/coseno sono ancora nel repo (`src/lib/operations-data.ts`,
  `src/lib/widgets/data.ts` — verificato con grep su `Math.sin`).
- **Zombie Prisma**: 48 modelli nello schema, di cui 11 col suffisso `_bN` più i doppioni
  `Kpi`/`KPI` e `FinancialData`/`FinancialRecord` (verificato su `prisma/schema.prisma`).
  `Report_b8`/`CustomDashboard_b8`/`NotificationPref_b8` sono ATTIVI nonostante il nome.
- **Split-brain competitor**: le scritture vanno su `Competitor` (import/commit e CRUD),
  ma la lettura per la UI passa da `Competitor_b7` (verificato su
  `src/lib/market-data.ts:77,96`) — un competitor importato non compare. Nota nuova:
  anche l'**export GDPR legge `competitor_b7`** (`src/app/api/gdpr/export/route.ts:137`),
  quindi i competitor importati non finiscono nemmeno nell'export dei dati dell'utente.
- **`main` è ancora divergente**: 4 commit unici su `origin/main` (ultimo: `935208c`,
  un bundle di design) non presenti nel tronco, che è avanti di 98 (verificato con
  `git rev-list --count`). La trappola del Production Branch su Vercel è stata
  disinnescata (§13), ma `main` resta un tronco vecchio con contenuto proprio: la
  chirurgia promessa non è stata fatta.

### 26.2 Cosa è arrivato dopo il §25 (il mese mancante)

Tutto verificato sul codice ora, salvo dove indicato:

- **Audit sicurezza/qualità del 2026-07-26** (riportato dal CLAUDE.md v5.0): nessun IDOR,
  no SQLi/XSS, nessun segreto hardcoded. Da quell'audit discendono i lavori sotto.
- **Controllo ruoli sulle azioni distruttive**: `requireManagerRole` (fail-closed, 403)
  applicato a **12 route** — le DELETE di receivables, recurring-expenses, reports,
  custom-dashboards, import batches, competitors; PATCH settings/organization; le 4
  route integrazioni; e la creazione share-link (verificato con grep: 12 file sotto
  `src/app/api`). Ruoli reali lowercase su `Membership.role`.
- **Contesto AI su dati reali**: `src/lib/ai-context.ts` importa `getFinancialFacts` e
  non contiene più KPI/competitor hardcoded (verificato su `ai-context.ts:2,73`). Le date
  passano dagli helper `Europe/Rome` di `src/lib/timezone.ts` (verificato: 5 usi in
  `financial-facts.ts`, `APP_TIME_ZONE = 'Europe/Rome'`).
- **`/api/ai/analyze` ora consuma crediti**: `consumeCredits` con decremento condizionale
  atomico, bloccato PRIMA della chiamata al modello; una modalità sconosciuta non costa
  nulla (verificato su `src/app/api/ai/analyze/route.ts:15,123-132`). Chiuso il debito
  "analyze non scala i crediti" del §19.
- **GDPR**: export completo dei dati (`/api/gdpr/export`) e cancellazione account con
  grazia di 30 giorni (`DELETION_GRACE_DAYS = 30` in `src/lib/gdpr/constants.ts:7`,
  richiesta in `/api/gdpr/account`, purge nel cron `/api/cron/gdpr-purge` registrato in
  `vercel.json`). Verificato sui file.
- **`xlsx` sostituito con `exceljs`**: la libreria vulnerabile senza fix è FUORI dal
  progetto (verificato: 0 occorrenze in package.json e nessun import; `exceljs ^4.4.0`
  usato in `src/lib/import/parse.ts`). Le 3 vulnerabilità critical del §10 CLAUDE.md
  sono scese: oggi `npm audit` dice **9 (1 low, 2 moderate, 6 high)**, quasi tutte con
  fix disponibile via `npm audit fix` (verificato a runtime ora).
- **Next.js 16 + React 19**: `next ^16.2.12`, `react ^19.2.8` (verificato su
  package.json). `tsc --noEmit` → 0 errori (verificato ora).
- **Guardia sul database di produzione** (`prisma/guard.ts`, 356 righe): blocca i 4 seed
  e `db:push`/`prisma:migrate` se una qualunque sorgente di `DATABASE_URL`/`DIRECT_URL`
  (shell, `.env`, `.env.local`, `prisma/.env`) punta al project ref di produzione; è
  **fail-closed** (blocca anche l'ignoto); sblocco solo con `ALLOW_PROD_DB_WRITE=yes`
  sulla stessa riga (verificato leggendo guard.ts e gli script in package.json:12-16).
  È la risposta alla regola d'oro del §10: il DB unico resta, ma i comandi che possono
  distruggerlo ora muoiono prima di collegarsi.
- **Conformità AI Act (trasparenza)**: le superfici AI portano il disclaimer e i link
  "quale modello usiamo" / "come trattiamo i tuoi dati" (verificato: chat-client.tsx,
  AgentClient.tsx, alert-detail.tsx, pagina import con avviso sui dati inviati ad
  Anthropic); la Privacy dichiara il **modello corrente reale** interpolando
  `ANTHROPIC_MODEL` nel testo (verificato su
  `src/app/[locale]/legal/privacy/page.tsx:3,23`); gli insight hanno l'etichetta
  "Generato da AI" (`insight-card.tsx:69` — ma vedi il debito sotto).
- **Vercel Web Analytics** montato nel root layout (`@vercel/analytics/next` in
  `src/app/layout.tsx:3`) — cookieless; il **cookie banner** è stato riscritto onesto:
  solo cookie tecnici, niente finte categorie marketing/analytics da accettare
  (verificato su `src/components/cookie-banner.tsx:30`).
- **Identità aziendale**: footer con "Lena di Ipek Mikail", Piazza Gramsci 8,
  41030 San Prospero (MO), P.IVA 04275010363, contact@anlyra.com (verificato su
  `site-footer.tsx:83-86` e nelle chiavi `landing.footer.*`); Privacy §1 e Terms §1
  riportano la stessa identità con PEC; footer email allineato
  (`src/lib/email/templates/_layout.ts:79`). **La P.IVA esiste**: il percorso Camera di
  Commercio del §20 è arrivato in fondo (riportato; il numero è nel codice).
- **Riparazione i18n post-incidente**: un cherry-pick risolto male (checkout --theirs)
  aveva riportato i file messaggi a una versione vecchia cancellando le sezioni AI Act,
  il footer aziendale e il banner onesto; ripristinato tutto da `63c2e52` + fix nome
  (commit `6aa9872`), poi aggiunte 18 chiavi mancanti reali (commit `c3df116`).
  IT e EN sono allineati (2148 foglie ciascuno, contando gli elementi degli array).

### 26.3 La fotografia aggiornata, in una frase per categoria

- **Cuore solido**: tutto quello del §2 (entrate/costi, scadenzario, ricorrenti, import,
  auth) PIÙ: agente AI a 5 modalità con streaming e crediti veri, motore dei fatti,
  billing Stripe persistente con trial onesto e gating a scadenza, PDF report da dati
  reali, GDPR export/cancellazione, sicurezza C1-C4/A1-A4 chiusa.
- **Promessa giusta costruita male**: Operations — invariata, a riposo, da rifare sui
  dati veri quando avrà senso.
- **Scenografia**: Mercato — invariata, a riposo. Più una NUOVA piccola: la tabella
  prezzi orfana (vedi sotto).
- **Pezzi che fingono di funzionare**: la categoria si è quasi svuotata. Restano lo stub
  insights (invisibile in UI) e l'etichetta "Generato da AI" sugli insight del seed.

### 26.4 Debiti e rischi ATTUALI, con giudizio di gravità

**Gravi (da chiudere prima di incassare soldi veri):**
- **Un solo database per sviluppo e produzione.** Il rischio è mitigato dalla guardia
  (fail-closed, verificata), ma la guardia protegge solo i comandi che passano da lei:
  uno script nuovo, una query a mano, un tool esterno non sono coperti. La soluzione
  vera — un progetto Supabase separato — resta da fare (decisione founder: per ora uno).
- **Stripe è in modalità TEST** (riportato §16-17; le chiavi sono su Vercel/.env, non
  verificabili dal codice). Prima di aprire: chiavi live, webhook live, prodotti live.
- **Webhook Stripe senza idempotency su `event.id`** (verificato: nessuna traccia di
  dedup in `src/app/api/webhooks/stripe/route.ts`). Un retry di Stripe può processare
  due volte lo stesso evento. Da fare insieme al passaggio LIVE.
- **Pagine legali ancora "in fase di revisione legale"** (il disclaimer lo dice, 2
  occorrenze in it.json — verificato). Con P.IVA attiva e pagamenti in arrivo, Privacy
  e Terms vanno fatti validare da un professionista. Non è più un dettaglio.

**Medi (brutti ma non bloccanti):**
- **Insight etichettati "Generato da AI" ma scritti dal seed.** L'unico writer di
  `Insight` sono `prisma/seed.ts` e `seed-insights.ts` (verificato con grep); la
  generazione vera è lo stub 503. Il badge AI Act su contenuto NON generato da AI è
  l'esatto contrario della trasparenza che vorrebbe dare. O si toglie il badge dai
  contenuti seed, o si collega la generazione vera.
- **Report "pianificati" che non partono mai**: la UI mostra frequenze e "prossima
  esecuzione", ma in `vercel.json` i cron sono solo `trial-check` e `gdpr-purge`
  (verificato). Nessun job genera/spedisce report. Il "Run now" invece è vero.
- **Sezioni report offerte ma mai generate**: il builder offre "Top clienti", "Churn",
  "Benchmark" (`src/lib/report-sections.ts:24-27`), ma il renderer le scarta sempre
  (`real-data.ts:186-190` ritorna `false`). L'utente le seleziona e riceve un PDF senza,
  in silenzio. Meglio nasconderle dal builder finché non esistono.
- **Cambio password non invalida le sessioni JWT** esistenti (sopra, 26.1).
- **Niente CSP** (verificato: nessuna Content-Security-Policy in next.config) e
  **niente audit log** delle azioni (l'unica cosa chiamata audit_log è un flag di
  feature nel piano Enterprise — `src/lib/billing/plans.ts:19`). Rimandate
  consapevolmente al §14; da riprendere post-lancio.
- **9 vulnerabilità npm** (1 low, 2 moderate, 6 high — verificato ora). Nessuna
  critical, la maggior parte fixabile con `npm audit fix` senza breaking: è diventato
  un lavoretto da un'ora, farlo.
- **Rate-limit fail-open**: senza le env Upstash il limite si disattiva con un warn
  (verificato su `src/lib/rate-limit.ts:58`). Oggi Upstash è configurato (riportato);
  ma se un domani le env si perdono, il sito resta aperto senza accorgersene.

**Piccoli (igiene):**
- **Tabella prezzi orfana con prezzi falsi**: `src/components/pricing-table.tsx` ha un
  piano "starter" e prezzi €29/79/199 mai esistiti; non è montata da nessuna route
  (verificato con grep sugli import) ma è un trappolone per chi la trovasse. Cancellarla
  o allinearla ai piani veri (PRO 49 / ADVANCED 149 / ENTERPRISE custom).
- **I seed usano `findFirst()` sull'organizzazione** (`seed-alerts.ts:12`,
  `seed-insights.ts:15-16` — verificato): in un DB condiviso prenderebbero la PRIMA org
  che trovano, anche di un cliente. La guardia li blocca prima, ma il pattern resta
  sbagliato: puntare sempre a `demo-org` esplicitamente.
- **I testi del motore dei fatti sono solo in italiano** (verificato su
  `financial-facts.ts:101-167`: titoli e descrizioni hardcoded in italiano). Un utente
  con lingua EN vede la pagina Situazione e il contesto AI in italiano. Da portare
  su next-intl quando si internazionalizza sul serio.
- **`pricing.title`/`pricing.subtitle`**: `PricingClient.tsx:18-20` chiama chiavi che
  non esistono — il testo identico esiste come `pricing.hero.*`. È un bug di codice
  (route `/pricing` mostra i nomi delle chiavi nei titoli): un rename da 2 righe.
- **Zombie Prisma e split-brain competitor** (sopra): la pulizia col LOTTO 1 del §10 è
  ancora tutta da fare, backup prima.
- **`AiAlert`/`AiAlertConfig`**: mai letti da funzioni di prodotto; oggi compaiono solo
  nell'export GDPR e nella cancellazione (verificato con grep). Candidati alla pulizia.

### 26.5 La direzione che vedo (aggiornata — opinione, non ordine)

Due mesi fa scrivevo che il problema era "gusci con l'interfaccia bella e il motore
finto". Oggi quel problema è sostanzialmente risolto: **quasi tutto quello che si vede
fa una cosa vera**, e i pezzi finti sono nascosti o dichiarati. Il progetto ha fatto il
salto che serviva: è online con dominio proprio, ha un'identità legale vera (ditta
individuale, P.IVA), un flusso di registrazione collaudato end-to-end, un agente AI che
consuma crediti veri su dati veri, e i binari dei pagamenti pronti in test.

Il collo di bottiglia adesso NON è il codice. È l'ultimo miglio commerciale-legale:
Stripe TEST→LIVE (con l'idempotency del webhook fatta insieme), le pagine legali
validate da un professionista, e la separazione del database di produzione. Sono tre
lavori noiosi e nessuno dei tre è una feature — ed è esattamente per questo che
rischiano di slittare mentre si fa altro. Il mio consiglio da collega: **congelare le
feature finché questi tre non sono chiusi**. Ogni giorno di sviluppo su funzioni nuove,
adesso, è un giorno in cui il prodotto poteva incassare e non l'ha fatto.

Subito dopo, in ordine di valore: togliere il badge "Generato da AI" dagli insight del
seed (o collegare la generazione vera — è l'ultima bugia rimasta visibile), nascondere
dal builder le sezioni report che non escono mai, e il fix da 2 righe su
`pricing.title`. Poi, con calma: pulizia zombie Prisma, CSP, audit log.

La regola che ha funzionato fin qui resta quella: un mattone alla volta, verificato sul
codice e sul database, mai sulla parola di un `.md` — questo incluso.

*Documento di valutazione, non un ordine. La rotta la tiene il fondatore.*
cd /workspaces/Anlyra && git fetch origin && git log --oneline -2 origin/claude/merge-repos-nextjs-rOZU3grep "ai:usage" /tmp/dev.log
## §27 — Aggiornamento 2026-08-25

### Sicurezza — falla Supabase RLS trovata e chiusa (VERIFICATO)

Supabase ha inviato due avvisi critici il 23/08: "RLS Disabled in Public" e "Exposed Sensitive
Data". In una sessione precedente questi avvisi erano stati giudicati un falso allarme, con la
motivazione che Anlyra non usa l'API REST di Supabase (accede al DB solo via Prisma). **Quel
giudizio era sbagliato**, ed è stato smentito da una prova diretta: l'API REST di Supabase è
attiva di default a prescindere da come l'applicazione accede al database.

Prove eseguite (VERIFICATE con curl reale sul progetto di produzione):
- senza chiave `anon` → HTTP 401 (l'API rifiuta chi non ha la chiave)
- con chiave `anon` → HTTP 200 e **dati reali restituiti**: la query su `User?select=email`
  ha restituito l'email di un utente vero
- 52 tabelle su 52 risultavano con `rowsecurity=false`, incluse `User` (passwordHash,
  emailVerifyToken, twoFactorSecret), `Session`, `FinancialRecord`, `Receivable`, `AuditLog`

Rischio reale: la chiave `anon` è progettata per stare nel browser e non è un segreto forte.
Anlyra non l'ha mai pubblicata da nessuna parte, quindi non risulta sfruttata — ma la porta
era aperta.

Intervento: RLS abilitata su **tutte e 52 le tabelle** dello schema `public`.
- prima su una sola tabella (`AuditLog`) come prova → Prisma continuava a leggere (5 righe),
  l'API REST restituiva `[]` invece dei dati
- poi sulle restanti 51 → 51 riuscite, 0 fallite, 0 tabelle rimaste scoperte
- dopo l'intervento: API REST su `User` → `[]`, sito di produzione (anlyra.com) → login e
  dashboard funzionanti (VERIFICATO nel browser)

Prisma non è soggetto a RLS perché si connette come utente proprietario del database: per questo
l'attivazione non ha rotto nulla.

**DEBITO APERTO — importante**: questa è una modifica al DATABASE, non al codice. Non è tracciata
in git e **non sopravviverebbe a una ricostruzione del database da zero**. Va portata in una
migration Prisma. Finché non lo è, chiunque ricrei l'ambiente si ritrova le 52 tabelle esposte.

Nota aggiuntiva: sono state abilitate solo le RLS, senza policy. Questo significa "nessuno passa
dall'API REST", che è il comportamento voluto oggi. Se un domani si volesse usare l'API REST di
Supabase (per esempio da un'app mobile), servirebbero policy vere per organizzazione.

### Lavoro completato dopo il §26

Tutto mergiato su `claude/merge-repos-nextjs-rOZU3`, ogni voce verificata nel browser o con
comandi reali prima del merge:

- **Sistema crediti riparato** (era rotto in tre modi): i crediti ora seguono il piano
  (PRO 200, ADVANCED 700) invece del default fisso 100; rinnovo mensile con azzeramento,
  agganciato al cron `trial-check` (Vercel Hobby consente 2 cron, entrambi occupati);
  l'acquisto di pacchetti ora incrementa davvero `Organization.aiCredits` — prima scriveva solo
  nel ledger, quindi **un cliente avrebbe pagato senza ricevere crediti** (flusso non ancora
  esposto in UI, nessun cliente reale coinvolto). VERIFICATO: `renewed:1` al primo giro,
  `skippedAlreadyRenewed:1` al secondo (nessun doppio accredito).
- **Esperienza a crediti esauriti**: il pulsante "Acquista altri" nella chat non faceva nulla;
  l'AI Agent lasciava inviare e poi mostrava "periodo di prova terminato" anche quando il
  problema erano i crediti. Corretti, tutti i percorsi portano a Fatturazione.
- **Prompt caching** su chat e agent. VERIFICATO sui log: `cacheWrite=1333 → cacheRead=1333 →
  cacheRead=2264` su tre messaggi consecutivi. NON applicato a insights e analisi alert
  (contesto sotto la soglia minima e chiamate isolate: costerebbe il 25% in più senza benefici).
- **Tono dell'AI corretto**: i prompt ordinavano di dichiarare i dati mancanti 4-7 volte
  ciascuno, e il modello obbediva a tutte, producendo paragrafi di scuse. Ora la regola sta in un
  blocco condiviso (`src/lib/ai/prompts/tone.ts`). VERIFICATO che il rigore resta: alla richiesta
  "stimami il churn in percentuale" il modello non produce cifre inventate.
- **Pulsante "Segnala un problema"** in topbar, invio email a contact@ con contesto tecnico,
  rate-limit 3/ora per utente. VERIFICATO: `[email] sent`, email ricevuta.
- **Pannello admin locale** (`admin/`, `npm run admin`, porta 3001): letture, modifica crediti/
  piano/ruoli, pulizie, lancio cron. Fuori da `src/`, escluso dal deploy via `.vercelignore`,
  rifiuta di partire in produzione, token CSRF sui POST. NON ANCORA PROVATO nel browser:
  l'inoltro porte del Codespace continua a dare 404 (problema di infrastruttura, non del codice —
  il server risponde 200 in locale).
- **Report pianificati funzionanti**: generano il PDF e lo inviano per email. VERIFICATO:
  `due:1 sent:1`, poi `due:0` al secondo giro. Aggiunta validazione dei destinatari (prima era un
  campo libero: si poteva far spedire i conti dell'azienda a un indirizzo qualsiasi).
- **Errori dei moduli visibili** dove l'utente sta guardando. Scoperto che nello Scadenzario e
  nelle Spese ricorrenti l'errore era **invisibile**: veniva disegnato dietro il dialogo.

### Chiarito: i due campi `plan` (VERIFICATO sul codice)

- `BillingSubscription.plan` è **quello vero**: decide funzionalità, limiti e crediti del rinnovo.
- `Organization.plan` è **legacy** (default "STARTER", che non è nemmeno un piano valido): letto
  in due soli punti, di cui uno inutilizzato; l'altro sceglie nome e prezzo nelle email di fine
  prova. Il pannello admin mostra entrambi e li evidenzia quando divergono.

### Debiti aperti dopo questo giro

- **RLS non in migration** (vedi sopra) — il più importante.
- CSP attiva in sola osservazione: nessuna violazione rilevata nel Codespace, va accesa
  (`CSP_ENFORCE=true`) dopo qualche giorno di traffico vero.
- Accumulo insight senza limite né paginazione: 20 generazioni = 100 card caricate tutte insieme.
- `contact@anlyra.com` ripetuto come stringa in 8 punti diversi.
- Le email sono tutte in italiano fisso, nessuna localizzata (9 template + i nuovi).
- Interfaccia di acquisto crediti mai collegata (secondo impianto billing orfano: `BillingClient`,
  `CreditsCard` e altri, mai montati da nessuna route).
- Stripe ancora in modalità test.
- Pagine legali da far validare da un professionista.
## §28 — Aggiornamento 2026-08-26

### Sicurezza — rate limiting riscritto (VERIFICATO)

Il difetto principale: se Upstash mancava o non rispondeva, `checkRateLimit`
restituiva sempre `success: true`. Tutte le protezioni anti-abuso si spegnevano
in silenzio, senza errori e senza che nessuno se ne accorgesse.

DECISIONE DEL FONDATORE: comportamento differenziato. Fail-closed dove un abuso
costa (autenticazione, chiamate AI, invio email), fail-open sul resto
(navigazione, letture). Un guasto di Upstash non deve buttare giù il sito, ma
non deve nemmeno lasciare aperta la porta dove un attacco costa soldi.

BUCHI TROVATI E CHIUSI (7 endpoint senza alcun rate limit):
- `/api/onboarding/organization` — **il più grave**: inviava un'email di invito
  per OGNI elemento di un array fornito dal client, a indirizzi arbitrari, senza
  limite né tetto. Un cannone da spam con mittente legittimo, capace di bruciare
  la reputazione del dominio su Resend. Aggiunti rate limit E un tetto di 20
  inviti per richiesta (senza il tetto il limite non limitava nulla).
- `/api/ai/alerts/[id]/analyze` — chiamava il modello Anthropic senza alcun
  freno se non i crediti, che si comprano.
- `/api/auth/verify-email` — pubblico, era un oracolo per indovinare token.
- `change-password`, `2fa/disable`, `2fa/setup`, `exchange-rates`.

BUG DI PROGETTAZIONE TROVATO E CORRETTO — **il sistema puniva il successo più
del fallimento**: un login riuscito consumava DUE gettoni (precheck + authorize),
uno fallito ne consumava uno. Con il limite a 5, un utente si autobloccava al
quarto accesso corretto. Osservato dal fondatore nel browser, diagnosi confermata
sui numeri.
Correzione: il budget viene consumato sempre (l'operazione resta atomica), ma
azzerato DOPO un'autenticazione riuscita. Chi non conosce la password non arriva
mai a quella riga. Il contatore per IP non viene mai azzerato di proposito: chi
possiede un account valido potrebbe entrarci in loop per ripulirlo e continuare a
tempestare altre email dalla stessa macchina.
Limiti alzati di conseguenza: login-email 5→8 (ora conta solo i fallimenti),
login-ip 10→30 (un ufficio dietro NAT si bloccava).

VERIFICATO NEL BROWSER: il blocco scatta davvero (429 nei log del server) e
resta attivo anche con la password corretta finché la finestra non scade — che è
il comportamento voluto.

L'INDIRIZZO IP era già letto correttamente: `x-real-ip`, lo stesso header che usa
l'helper ufficiale di Vercel (verificato sul loro sorgente, non sul commento nel
file). Reso rumoroso il ripiego `'unknown'`, che prima era silenzioso.

Totale: 20 bucket, ognuno con politica dichiarata accanto al limite. Marcatore
cercabile nei log: `[rate-limit:unavailable]`.

### Consumi AI

- **Prompt caching** su chat e agent. VERIFICATO sui log:
  `cacheWrite=1333 → cacheRead=1333 → cacheRead=2264` su tre messaggi
  consecutivi. NON applicato a insight e analisi alert: contesto sotto la soglia
  minima e chiamate isolate, costerebbe il 25% in più senza benefici.
- **Modelli per superficie** (`src/lib/ai/models.ts`): chat, agent e insight
  restano su `claude-sonnet-5`; l'analisi alert passa a `claude-haiku-4-5` —
  è l'unica superficie che non riceve il contesto business, quindi un modello
  grande non avrebbe nulla in più su cui lavorare. VERIFICATO nel log:
  `model=claude-haiku-4-5`.
  TRAPPOLA EVITATA: Haiku ha una soglia di caching di 4096 token contro i 1024
  di Sonnet. Se gli alert avessero usato la cache, il declassamento l'avrebbe
  disattivata in silenzio. Verificato che non era il caso.
- Il log `[ai:usage]` ora riporta anche il modello: senza, dagli stessi token non
  si può risalire al costo.
- ONESTÀ SUL RISPARMIO: circa 0,2 centesimi per clic sugli alert. Il grosso della
  spesa sta nelle tre superfici NON toccate (chat, agent, insight), dove l'input
  è grande e l'output lungo. Lì il risparmio si fa col caching, già attivo.
- **Funzioni automatiche: non ce n'è nessuna.** Cercato e dimostrato: tutte e 4
  le chiamate AI sono dietro un clic esplicito, nessun cron tocca il modello,
  nessun refresh periodico. Il principio "nulla consuma crediti senza che
  l'utente lo chieda" era già rispettato.

### Sistema crediti — era rotto in tre modi (ora corretto)

- I crediti erano un default fisso di 100 indipendente dal piano. La causa radice
  era la registrazione: il codice che crea un'organizzazione non li impostava
  mai, quindi ogni nuovo cliente ereditava il default in silenzio. Ora seguono il
  piano (PRO 200, ADVANCED 700).
- Nessun rinnovo mensile funzionante. Ora agganciato al cron `trial-check`
  (Vercel Hobby consente 2 cron, entrambi occupati), con azzeramento e non
  accumulo. VERIFICATO: `renewed:1` al primo giro, `skippedAlreadyRenewed:1` al
  secondo.
- L'acquisto di pacchetti scriveva solo nel registro senza incrementare il saldo
  vero: **un cliente avrebbe pagato senza ricevere crediti**. Corretto. Il flusso
  non è mai stato esposto in UI, nessun cliente coinvolto.
- Default nello schema lasciato a 100 di proposito: se un percorso futuro
  dimenticasse di impostarli, il danno è "troppo pochi crediti" (visibile) invece
  di un regalo silenzioso.

### Alert e dati finti — censimento (VERIFICATO)

L'alert "churn 6.9%, 17 clienti persi su 247" non è un difetto del motore: il
seed è stato costruito apposta per farlo scattare (commento esplicito in
`prisma/seed.ts:152-166`). Le 6 regole leggono tutte tabelle che un cliente vero
può popolare: 4 da `FinancialRecord` (import e inserimento manuale), 2 da
`CustomerStat` (stessi percorsi). **Nessuna regola è finta in sé.**

**Un cliente nuovo non vede nessun alert inventato**: verificato guardia per
guardia, con tabelle vuote nessuna regola scatta e nessuna inventa un default.
Il difetto è confinato a `demo-org`.

TROVATO — stesso difetto, pagina ATTIVA nel menu: **Custom Dashboards**
(`src/lib/widgets/data.ts`) è interamente sintetica. Tutti i 9 widget leggono da
un generatore hardcoded (revenue 48.000, churn 4,2, seno/coseno) che non tocca
mai il database, con la data congelata al 26 aprile 2026. Peggio degli alert: qui
non c'è nemmeno una query. DECISIONE DEL FONDATORE: collegarla ai dati veri
(lavoro grosso, sessione dedicata).

`seedKpis()` gira a RUNTIME dentro `getDemoContext()`, non è uno script: i KPI
finti (churn 4.2, NPS 42) si riscrivono da soli a ogni apertura anonima della
dashboard.

### Demo — lavoro fatto ma NON mergiato

Branch `claude/explicit-demo` (commit `016a94f`): visitatore anonimo → login,
pulsante esplicito "prova la demo", sola lettura lato server, banner "dati
dimostrativi". Include anche la chiusura di un buco nel middleware
(`/scadenzario`, `/situazione`, `/spese-ricorrenti` non erano protette).

**NON mergiato per decisione del fondatore.** Motivo: renderebbe `demo@pro.app`
in sola lettura, e quello è l'account usato per le prove quotidiane. Da
riprendere insieme al lavoro deciso: nella demo le funzioni AI devono **dare
risposte finte ma realistiche** invece di essere disabilitate, così il visitatore
prova il prodotto senza costi reali. Quelle risposte andranno etichettate come
esempi (stesso principio AI Act già applicato altrove).

### Altro fatto in questo giro

- Paginazione insight (12 per pagina), e **corretto un bug**: il filtro per stato
  veniva inviato dalla pagina ma la route non lo leggeva mai.
- `contact@anlyra.com` era ripetuto in **38 punti**, non 8 (26 dentro i testi
  legali). Ora c'è `src/lib/company.ts` più uno script di verifica
  (`npm run check:company`) per la parte che una costante non può raggiungere.
- I dati strutturati per Google dichiaravano `addressLocality: 'Bologna'` — un
  segnaposto rimasto. Ora è San Prospero.
- 7 file di codice morto eliminati, inclusa una tabella prezzi orfana con prezzi
  falsi (€29/79/199 e un piano "starter" inesistente).
- Errori dei moduli mostrati dove l'utente guarda. Scoperto che nello Scadenzario
  e nelle Spese ricorrenti l'errore era **invisibile**: veniva disegnato dietro
  il dialogo.
- Report pianificati funzionanti (PDF + email). VERIFICATO: `due:1 sent:1`, poi
  `due:0`. Aggiunta validazione destinatari: il campo era libero, si poteva far
  spedire i conti dell'azienda a un indirizzo qualsiasi.
- Pulsante "Segnala un problema" in topbar, email a contact@. VERIFICATO.
- Pannello admin locale (`npm run admin`, porta 3001, fuori da `src/`, escluso
  dal deploy). Funzionante nel browser dopo aver inoltrato la porta.

### Difetti noti, non ancora affrontati

- **Custom Dashboards interamente sintetica** (menu attivo) — il più grave.
- Il pulsante "Genera con AI (3 crediti)" in cima alla pagina Alert mostra sempre
  "crediti insufficienti": non esiste nessun endpoint dietro, è una funzione mai
  finita.
- `Organization.plan` (legacy, default "STARTER" che non è un piano valido) e
  `BillingSubscription.plan` (quello vero) possono divergere. Il secondo decide
  funzionalità, limiti e crediti; il primo serve solo al nome del piano nelle
  email di fine prova.
- `/api/ai/alerts/check` è un duplicato byte-identico di `/refresh`, mai chiamato.
- Il refresh degli alert riporta a NEW quelli già archiviati.
- `benchmarks/route.ts:84` confronta un LTV in euro con un rapporto LTV/CAC.
- L'anteprima del report builder usa dati d'esempio senza dichiararlo.
- Le email sono tutte in italiano fisso, nessuna localizzata.
- Interfaccia acquisto crediti mai collegata (secondo impianto billing orfano).
- CSP in sola osservazione: nessuna violazione rilevata sul sito vero, va accesa
  con `CSP_ENFORCE=true` su Vercel dopo qualche giorno di traffico.
- Stripe ancora in modalità test.
- Pagine legali da far validare da un professionista.
## §29 — Aggiornamento 2026-09-01

### Fatto amministrativo: via libera

Il 01/09/2026 è arrivato il via libera della Camera di Commercio e la delega al
commercialista (Fiscozen) è stata conferita. **Anlyra è un'attività operativa a
tutti gli effetti.** Da qui il piano deciso dal fondatore, in quest'ordine:
pulizia del codice → sicurezza → configurazione Stripe in produzione →
fatturazione. Toccare i pagamenti su codice non ancora ripulito significherebbe
scoprire i problemi quando ci sono soldi di mezzo.

### Custom Dashboards — il difetto non era quello che sembrava (VERIFICATO)

Il censimento ha rivelato **due sistemi separati**, non uno:
- **Sistema A** (attivo, raggiungibile dal menu): salvava su `CustomDashboard_b8`
  ma **nessuna pagina disegnava i widget**. Un cliente non vedeva numeri
  inventati: non vedeva numeri e basta.
- **Sistema B** (irraggiungibile): 14 tipi, 11 componenti, generatore interamente
  sintetico con data congelata al 26 aprile 2026, salvataggio in localStorage.
  Due file di codice morto e una pagina non linkata che cercava le dashboard in
  un archivio diverso da dove venivano salvate.

Il sistema B conteneva un widget "ai" che **dichiarava `generatedBy: 'Claude
Sonnet 4'` mentre i testi erano stringhe fisse nel codice** — una dichiarazione
AI falsa, contraria all'AI Act già applicato altrove.

LAVORO FATTO (branch `claude/real-custom-dashboards`, commit `f16d780`):
- Sistema B cancellato per intero: 19 file, ~1.900 righe. Prova documentata che
  nessuno lo importava. Falsa dichiarazione AI eliminata.
- Catalogo ridotto ai 9 tipi con una fonte vera. `list_top_customers` rimosso per
  decisione del fondatore: l'unica fonte con nomi veri sarebbe lo scadenzario, e
  sarebbe diventato "top clienti per crediti" — un'altra cosa rispetto al titolo.
- Tutti e 9 i widget collegati a dati reali, riusando le route `/api/analysis/*`
  già esistenti: nessun endpoint dati nuovo. Sei widget sullo stesso periodo
  fanno UNA sola richiesta HTTP.
- Ogni widget ha uno stato vuoto **obbligatorio per tipo** (lo impone il
  compilatore) che spiega cosa fare per popolarlo, mai un numero inventato.
- Il builder ora salva periodo e metrica in `config`; le dashboard già salvate
  continuano a funzionare con i default (retrocompatibilità provata).
- `/custom-dashboards/[id]` rifatta sul database e spostata DENTRO il gruppo
  `(dashboard)`: prima si apriva senza barra laterale, senza topbar e senza il
  banner della demo.
- Le dashboard sono finalmente apribili dalla lista: prima l'unico comando su una
  card era il cestino.

BUG TROVATO NELLA PROVA E CORRETTO — il periodo scelto non veniva rispettato. La
causa NON era dove la cercavamo: salvataggio, schema API, scrittura e lettura
erano tutti corretti. Il difetto era che `kpis.totalRevenue` **non è mai stato la
somma del periodo**: per costruzione è il ricavo dell'ULTIMO MESE, quindi il
numero non si sarebbe mosso comunque. Corretto sommando le categorie, che nella
stessa risposta sono già filtrate per periodo.
Rimossa anche l'opzione "periodo" da `chart_revenue_trend`: non filtrava nulla
(il grafico storico mostra sempre tutta la storia, ed è la convenzione dell'app),
quindi era una promessa non mantenuta nell'interfaccia.

NON FATTO, dichiarato: il builder resta una lista con frecce su/giù, non una
griglia trascinabile — quel pezzo apparteneva al sistema B cancellato. E non
esiste la modifica di una dashboard già salvata (non esisteva nemmeno prima).

### Segnalato e NON corretto: stesso difetto in Finanza → Panoramica

`finance/page.tsx:72` mostra `data.kpis.totalRevenue` accanto a un selettore di
periodo che non lo influenza — stesso difetto strutturale appena corretto nei
widget, ma su una pagina preesistente e non toccata. **Da affrontare nella
sessione di pulizia.**

### Stato dei branch

- `claude/real-custom-dashboards` (`f16d780`) — da provare e mergiare.
- `claude/explicit-demo` (`016a94f`) — pronto ma NON mergiato per decisione del
  fondatore: renderebbe `demo@pro.app` in sola lettura, ed è l'account usato per
  le prove quotidiane. Da riprendere insieme al lavoro deciso: nella demo le
  funzioni AI devono **dare risposte finte ma realistiche** invece di essere
  disabilitate, così il visitatore prova il prodotto senza costi reali. Quelle
  risposte andranno etichettate come esempi (stesso principio AI Act).

### Valutato e scartato: Graphify

Proposto come strumento per ridurre i costi. Verificato: **non riduce i costi API
di Anlyra** — è uno strumento di sviluppo che costruisce un grafo del codice
perché l'assistente lo interroghi invece di leggere i file. Il 70% di risparmio
citato non risulta dalla loro documentazione.
Scartato per una ragione di metodo: un grafo è un livello di riassunto, e la
regola d'oro di questo documento è che **la verità è nel codice**. Tutte le cose
trovate in queste sessioni — i 38 indirizzi email invece di 8, il campo
destinatari che spediva a chiunque, il seed che colpiva l'organizzazione
sbagliata — sono emerse leggendo il codice vero, non una mappa. STATO-REALE e
CLAUDE.md svolgono già la funzione di mappa scritta.

### Prossimi passi decisi

1. **Pulizia del codice** (sessione nuova, con lista di controlli del fondatore)
2. **Sicurezza**
3. **Stripe in produzione**
4. **Fatturazione**
## §30 — Lavori incompiuti (aperta 2026-09-02)

Codice che ESISTE ma non è finito. Diverso dal codice morto (archiviato nei lotti
1 e 2): questo va completato, non cancellato.

1. **Interfaccia 2FA e log accessi** — `src/components/security/*.tsx` (4 file).
   Le API `/api/auth/2fa/*` sono vive e funzionanti; manca la schermata collegata.
   Dipendenza da ricordare: `audit-log.tsx` importa `src/components/feature-gate.tsx`
   — per questo quel file NON è stato cancellato nel lotto 2.
2. **I due campi `plan` divergono** — il webhook Stripe scrive
   `BillingSubscription.plan` ma NON `Organization.plan`, che però decide l'accesso
   alla pagina Integrazioni (`planMeets`). Oggi invisibile grazie ai valori di
   default. **DA CHIUDERE PRIMA DI STRIPE LIVE.**
3. **`/api/market/exchange-rates`** — pubblica, senza autenticazione, nessun
   chiamante interno. Da valutare nella fase sicurezza.
4. **`/api/ai/alerts/check`** — nessun chiamante, non è nei cron di vercel.json.
   Sembra il gemello vecchio di `/refresh`. Da capire prima di toccarla.
5. **Tre implementazioni di `ok/fail`** — `@/lib/api` (49 file), `@/lib/api/response`
   (15), `@/lib/api-response` (0 dopo il lotto 1). Da unificare: tocca 65 file,
   rumoroso, non urgente.
6. **14 modelli Prisma a zero usi** — 13 legati da chiavi esterne: serve una
   migration dedicata col backup del DB. Ultimo della coda.
7. **Decisione su `main`** — resta il tronco vecchio e il default branch su GitHub.
8. **9 errori eslint preesistenti** in `src/` — mai guardati.
9. **Finanza → Panoramica**: un totale accanto a un selettore di periodo che non lo
   influenza (stesso difetto già corretto in Custom Dashboards).