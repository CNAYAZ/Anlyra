---
title: Anlyra · Code of Conduct — Violations Procedure
audience: interno (team Anlyra che gestisce le segnalazioni)
status: operativo
last_updated: 2026-05-27
---

# Code of Conduct — Violations Procedure

> Procedura interna per gestire le segnalazioni di violazione del Codice di Condotta o dell'
> Acceptable Use Policy. Documento operativo per il team che gestisce le segnalazioni.

**Documenti correlati**: [`feedback-loop-process.md`](feedback-loop-process.md),
[`../legal/aup.md`](../legal/aup.md), [`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md).

**Canale segnalazioni**: conduct@anlyra.it

---

## 1. Canali di segnalazione

| Tipo | Canale | Note |
|---|---|---|
| Violazione AUP | abuse@anlyra.it | Usi vietati della piattaforma |
| Comportamento utente | conduct@anlyra.it | Interazioni inappropriate |
| Segnalazione sicurezza | security@anlyra.it | Vulnerabilità, data breach sospetti |
| Segnalazione in-app | Pulsante "Segnala" (futuro) | Da implementare in FASE E |

---

## 2. Processo di gestione

### Step 1 — Ricezione e acknowledgment (entro 24h)

- Assegnare un numero di protocollo: `VIO-AAAA-MM-NNN`.
- Inviare email di acknowledgment al segnalante: "Abbiamo ricevuto la segnalazione #VIO-XXX.
  Ci faremo carico di indagare entro 7 giorni lavorativi."
- Aprire record interno (Notion/spreadsheet) con: data, canale, segnalante (anonimo se richiesto),
  utente segnalato, descrizione.

### Step 2 — Triage iniziale (entro 48h)

Classificare per urgenza:

| Urgenza | Criteri | SLA risposta |
|---|---|---|
| **Critica** | Attività illegale, sicurezza, data breach | 4h — azione immediata |
| **Alta** | Abuso ripetuto, spam massiccio | 24h |
| **Media** | Prima violazione, comportamento borderline | 7 giorni lavorativi |
| **Bassa** | Segnalazione ambigua o non classificabile | 14 giorni |

### Step 3 — Investigazione (entro 7 giorni lavorativi)

- Raccogliere evidenze: log di accesso, contenuto segnalato, storico account.
- Valutare il contesto: prima violazione? comportamento intenzionale? impatto su altri utenti?
- Consultare, se necessario, un secondo membro del team (bias prevention).

### Step 4 — Decisione e azione

Applicare il livello di conseguenza appropriato (vedi §3).

### Step 5 — Comunicazione

- Al segnalante: esito della segnalazione (senza dettagli sull'utente segnalato per privacy).
- All'utente segnalato: comunicazione della conseguenza applicata + motivazione + diritto di appello.

---

## 3. Quattro livelli di conseguenza

| Livello | Conseguenza | Quando |
|---|---|---|
| 1 — Avvertimento | Email formale di avvertimento + reminder AUP | Prima violazione lieve |
| 2 — Sospensione temporanea | Account disabilitato per 7-30 giorni | Violazione ripetuta o moderata |
| 3 — Ban | Account terminato permanentemente; dati cancellati | Violazione grave |
| 4 — Ban pubblico + segnalazione | Come ban, + comunicazione pubblica se richiesto dalla legge | Attività illegale |

**Escalation**: ogni livello superiore include automaticamente le conseguenze dei livelli inferiori.

---

## 4. Processo di appello

- L'utente segnalato ha 14 giorni per presentare appello via email a conduct@anlyra.it.
- L'appello viene esaminato da persona diversa da chi ha gestito l'investigazione.
- Risposta all'appello entro 14 giorni lavorativi.
- La decisione sull'appello è definitiva.

---

## 5. Privacy e riservatezza

- L'identità del segnalante è protetta; non viene rivelata all'utente segnalato.
- I record di violazione sono conservati per 3 anni per finalità di audit.
- Segnalazioni in buona fede non espongono il segnalante a conseguenze.

---

**Status**: operativo.  
**Last updated**: 2026-05-27.
