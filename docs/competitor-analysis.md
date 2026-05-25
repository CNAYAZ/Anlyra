---
title: Anlyra · Competitor Analysis
audience: founder, sales
last_updated: 2026-05-25
status: living document · internal
---

# Competitor Analysis

> Il landscape competitivo di Anlyra. Per affilare il pitch e informare la roadmap.

**Nota**: documento interno. I dati di pricing e posizionamento dei competitor sono basati su informazioni pubbliche al maggio 2026 e vanno verificati periodicamente. Documenti correlati: [`sales-pitch-deck-outline.md`](sales-pitch-deck-outline.md), [`roadmap.md`](roadmap.md).

---

## Panoramica sintetica

| Competitor | Origine | Target | Pricing (range) | Categoria |
|------------|---------|--------|-----------------|-----------|
| Datafox / Affinity | US | Sales/VC intelligence | $$$$ (enterprise) | Relationship intelligence |
| ChartHop | US | People analytics / HR | $$$ | HR analytics |
| Visible | US | Startup → investor reporting | $$ | Investor reporting |
| Finbox | US | Investitori, analisti | $–$$ | Financial modeling |
| Pulse Software | UK | PMI KPI tracking | $$ | KPI dashboard |
| Klipfolio | Canada | SMB dashboards | $–$$ | KPI dashboard |
| Looker / Looker Studio | US (Google) | Generalista BI | Free–$$$$ | BI generico |
| Tableau | US (Salesforce) | Enterprise BI | $$$$ | BI enterprise |

Legenda pricing: `$` < €30/mese · `$$` €30–150 · `$$$` €150–500 · `$$$$` €500+/enterprise.

---

## Analisi per competitor

### Datafox / Affinity

**Target**: team vendite e venture capital che mappano relazioni e segnali su aziende.
**Forza**: dataset proprietario enorme, integrazione CRM profonda.
**Debolezza**: costoso, orientato al mercato US, irrilevante per una PMI italiana che vuole capire i propri numeri.
**Differenziazione Anlyra**: dominio diverso. Loro fanno sales intelligence su aziende terze; noi facciamo analytics sui dati interni del cliente. Non sono concorrenti diretti.

### ChartHop

**Target**: HR e leadership per people analytics (org chart, compensation, headcount).
**Forza**: visualizzazione organizzativa eccellente.
**Debolezza**: monoverticale (solo HR), prezzo alto, nessun focus finanziario.
**Differenziazione Anlyra**: Anlyra è cross-funzionale (finance + operations + market), ChartHop solo people. Per una PMI che vuole una vista unica, ChartHop copre una fetta sola.

### Visible

**Target**: startup che fanno reporting periodico agli investitori.
**Forza**: ottimo per update agli investor, template curati.
**Debolezza**: caso d'uso ristretto (investor reporting), assume di avere già investitori.
**Differenziazione Anlyra**: noi serviamo PMI che spesso NON hanno investitori e vogliono capire il business per sé stesse, non per reportare a terzi.

### Finbox

**Target**: investitori e analisti finanziari (valutazione titoli, modelli DCF).
**Forza**: profondità di modeling finanziario.
**Debolezza**: per addetti ai lavori, curva di apprendimento alta, orientato ai mercati pubblici.
**Differenziazione Anlyra**: Finbox modella aziende quotate per chi investe; Anlyra spiega i numeri della TUA azienda a chi la gestisce. Pubblico opposto.

### Pulse Software

**Target**: PMI UK che vogliono tracciare KPI e piani strategici.
**Forza**: orientato PMI, focus su KPI e accountability.
**Debolezza**: poco AI, inserimento dati prevalentemente manuale, mercato UK-centrico.
**Differenziazione Anlyra**: l'AI che genera insight automaticamente è il nostro cuore; Pulse è più un tracker manuale. Inoltre noi siamo italiano-first.

### Klipfolio

**Target**: SMB globali che costruiscono dashboard KPI da molte fonti.
**Forza**: tante integrazioni, dashboard flessibili, prezzo accessibile.
**Debolezza**: richiede setup tecnico (sei tu a costruire le dashboard), nessun insight AI proattivo, generalista non localizzato.
**Differenziazione Anlyra**: Klipfolio ti dà gli strumenti e ti lascia costruire; Anlyra arriva già configurato per le metriche PMI e ti dice cosa guardare. Meno DIY, più guidato.

### Looker / Looker Studio

**Target**: dal gratuito (Studio) all'enterprise data team (Looker).
**Forza**: gratis (Studio), potente e scalabile (Looker), ecosistema Google.
**Debolezza**: Studio è grezzo e richiede competenze; Looker richiede un data team e modellazione LookML. Nessuno dei due è "plug and play" per una PMI senza analisti.
**Differenziazione Anlyra**: noi eliminiamo la necessità di un data analyst. Looker è potentissimo ma presuppone competenze che la nostra PMI target non ha in casa.

### Tableau

**Target**: enterprise con team BI dedicati.
**Forza**: standard di mercato per visualizzazione, capacità enormi.
**Debolezza**: costoso, complesso, overkill per una PMI, richiede formazione e licenze.
**Differenziazione Anlyra**: Tableau è una Ferrari che serve un pilota. La nostra PMI vuole arrivare a destinazione senza imparare a pilotare. Semplicità + AI + prezzo accessibile + italiano.

---

## Posizionamento Anlyra nel landscape

Anlyra occupa uno spazio specifico: **analytics AI guidato, per PMI italiane, senza bisogno di competenze tecniche.**

Gli assi di differenziazione:

- **Verticale geografico**: italiano-first, dati EU, conforme alla realtà fiscale e culturale italiana. Nessun grande player è localizzato per le PMI italiane.
- **Guidato vs DIY**: i tool BI (Looker, Tableau, Klipfolio) ti danno strumenti; Anlyra ti dà risposte.
- **AI proattiva**: l'AI trova e segnala, non aspetta che tu costruisca query.
- **Prezzo accessibile + premium positioning**: sotto l'enterprise BI, sopra i tracker manuali economici.

---

## Moat — Cosa ci rende difficili da copiare

1. **Localizzazione profonda PMI italiane**: non solo lingua, ma benchmark di settore, logiche fiscali, integrazioni con gestionali italiani (roadmap). Un player US non lo replica facilmente.
2. **Privacy come posizionamento**: dati EU, no training AI. Credibile e difendibile, attraente per il mercato europeo post-GDPR.
3. **Onboarding white glove → dati di training reali**: ogni cliente affina la nostra comprensione di cosa serve davvero alle PMI italiane.
4. **Velocità di iterazione**: come team piccolo e focalizzato, iteriamo più veloce dei grandi su un verticale stretto.

Onestamente: nessuno di questi è un moat invalicabile da solo. Il vantaggio sta nella **combinazione** + nell'esecuzione veloce sul verticale italiano.

---

## Risk — Chi potrebbe diventare competitor diretto in 12–24 mesi

- **Software gestionali italiani** (Zucchetti, TeamSystem, Fatture in Cloud) che aggiungono un layer analytics AI sopra i dati che già possiedono. **Rischio alto**: hanno già i dati e la base clienti.
- **Player BI globali** che lanciano un'offerta "AI insights" semplificata e localizzata. **Rischio medio**: hanno la tecnologia ma non la focalizzazione.
- **Nuove startup** con la stessa tesi sul mercato italiano. **Rischio medio**: dipende dalla velocità di esecuzione.

Mitigazione: muoversi veloci su integrazioni con i gestionali italiani (renderli partner prima che competitor) e costruire il brand "privacy + AI per PMI" prima degli altri.

---

## Win/Loss reasons

**Perché i clienti scelgono Anlyra** (ipotesi da validare con dati reali):

- "Finalmente capisco i miei numeri senza assumere un analista."
- "È in italiano e capisce la mia realtà."
- "Mi fido di dove tengono i dati."
- "L'AI mi ha mostrato cose che non vedevo."

**Perché potremmo perdere**:

- "Uso già il gestionale X che mi basta."
- "Troppo presto, non ci fidiamo di un prodotto pre-launch."
- "Il prezzo è alto per la mia micro-impresa." (segnale di target sbagliato)
- "Mi serve una feature che non avete ancora" (vedi [`roadmap.md`](roadmap.md)).

Ogni deal perso va loggato con il motivo reale: alimenta sia il pitch sia la roadmap.

---

**Status**: living document interno. Rivedere il pricing e il posizionamento dei competitor ogni trimestre.
