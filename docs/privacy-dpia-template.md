---
title: Anlyra · DPIA Template
audience: DPO, product team
last_updated: 2026-05-25
status: living document
---

# Privacy DPIA Template

> Quando e come condurre una Valutazione d'Impatto sulla Protezione dei Dati (DPIA) per le feature Anlyra ad alto rischio privacy.

**Nota**: questo è un template operativo, non un parere legale. La DPIA va validata dal DPO (consulente esterno da nominare pre-launch). Correlati: [`SECURITY.md`](SECURITY.md), [`incident-response-playbook.md`](incident-response-playbook.md) §6 (data breach).

---

## 1. Quando fare una DPIA

La DPIA è **obbligatoria** quando un trattamento può comportare un rischio elevato per i diritti delle persone (art. 35 GDPR). In particolare:

- **Profilazione automatica** con effetti giuridici o significativi sulle persone.
- **Trattamento su larga scala** di categorie particolari di dati (sensibili).
- **Sorveglianza sistematica** di un'area accessibile al pubblico.
- **Nuove tecnologie** che possono creare rischi non valutati (es. AI generativa).

Regola pratica per Anlyra: **ogni nuova feature che invia dati a terzi, profila utenti, o introduce un nuovo tipo di trattamento richiede almeno uno screening DPIA.** Se due o più criteri sopra si applicano, la DPIA completa è dovuta.

---

## 2. DPIA template

### Sezione A — Descrizione del trattamento
- Quale feature/processo?
- Quali dati personali tratta?
- Finalità del trattamento?
- Chi sono gli interessati?
- Flusso dati: da dove a dove, quali terzi coinvolti?
- Base giuridica (art. 6 GDPR)?

### Sezione B — Necessità e proporzionalità
- Il trattamento è necessario alla finalità dichiarata?
- Esiste un modo meno invasivo per ottenere lo stesso risultato?
- I dati raccolti sono minimizzati (solo il necessario)?
- Per quanto tempo vengono conservati e perché?

### Sezione C — Rischi per gli interessati
- Quali rischi (accesso non autorizzato, perdita, uso improprio, trasferimento extra-UE)?
- Probabilità di ciascun rischio (bassa/media/alta)?
- Gravità dell'impatto (bassa/media/alta)?

### Sezione D — Misure di mitigazione
- Quali misure tecniche (cifratura, anonimizzazione, controllo accessi)?
- Quali misure organizzative (DPA con i terzi, formazione, log)?
- Rischio residuo dopo le mitigazioni?

### Sezione E — Consultazione
- È necessario consultare il DPO? (sempre consigliato)
- Il rischio residuo è elevato al punto da richiedere consultazione preventiva del Garante (art. 36)?

### Sezione F — Decisione e sign-off
- Decisione: approvato / approvato con condizioni / respinto.
- Condizioni eventuali.
- Data, owner, firma DPO.
- Data di revisione prevista.

---

## 3. Esempio compilato — AI insights generation

> Esempio illustrativo per mostrare come si compila. Da adattare al caso reale.

**Sezione A — Descrizione**
- Feature: generazione di insight via invio di dati aggregati a Anthropic Claude (API US).
- Dati: metriche aggregate dell'organizzazione; potenziale presenza incidentale di PII nei nomi di categoria o campi liberi.
- Finalità: produrre analisi automatiche per il cliente.
- Interessati: clienti dell'organizzazione, eventualmente persone citate nei dati.
- Flusso: DB Anlyra (EU) → API Anthropic (US) → risposta → storage insight (EU).
- Base giuridica: esecuzione del contratto (art. 6.1.b).

**Sezione C — Rischi**
- Trasferimento internazionale (US): probabilità alta, gravità media.
- Retention dei dati lato provider: probabilità bassa, gravità media.
- Esposizione incidentale di PII nei prompt: probabilità media, gravità media.

**Sezione D — Mitigazioni**
- DPA firmato con Anthropic, con clausole contrattuali standard (SCC) per il trasferimento.
- Esclusione contrattuale esplicita dell'uso dei dati per il training.
- Minimizzazione: invio di dati aggregati, non di record individuali, dove possibile.
- Anonimizzazione/pseudonimizzazione dei campi PII prima dell'invio.
- Rischio residuo: basso-medio.

**Sezione F — Decisione**
- Decisione: **approvato con condizioni**.
- Condizioni: mantenere SCC aggiornate; rivedere se Anthropic cambia la policy dati; monitorare l'esposizione PII nei prompt.
- Revisione: annuale o ad ogni cambio contrattuale del provider.

---

## 4. Riferimenti normativi

- **Art. 35 GDPR** — Valutazione d'impatto sulla protezione dei dati.
- **Art. 36 GDPR** — Consultazione preventiva dell'autorità di controllo.
- **Linee guida WP248 (ex Art. 29 Working Party)** sulla DPIA e sui criteri di "rischio elevato".
- **Provvedimenti del Garante per la protezione dei dati personali** (autorità italiana) — elenco dei trattamenti soggetti a DPIA.
- **SCC (Standard Contractual Clauses)** per i trasferimenti extra-UE.

---

## 5. Owner del processo DPIA

- **Responsabile**: DPO esterno consulente (**da nominare prima del lancio commerciale**).
- **Supporto interno**: product owner della feature + responsabile tecnico.
- **Cadenza**: screening ad ogni nuova feature ad alto rischio; revisione delle DPIA esistenti almeno annuale.

---

**Status**: living document. Il template va validato dal DPO una volta nominato; le DPIA compilate vanno archiviate in modo sicuro e versionato.
