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

*Documento di valutazione, non un ordine. Aggiornare quando lo stato reale cambia —
rileggendo il codice, non i vecchi `.md`. La rotta la tiene il fondatore.*
