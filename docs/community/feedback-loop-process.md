---
title: Anlyra · Feedback Loop Process
audience: CS team / prodotto / founder
status: operativo
last_updated: 2026-05-27
---

# Feedback Loop Process

> Processo per raccogliere, triagere e chiudere il loop sul feedback degli utenti. L'obiettivo
> è che ogni utente sappia che il suo feedback ha raggiunto il team e, dove possibile, sia stato
> considerato.

**Documenti correlati**: [`../customer-success-playbook.md`](../customer-success-playbook.md),
[`../email/onboarding-sequence.md`](../email/onboarding-sequence.md),
[`../roadmap.md`](../roadmap.md), [`../kpi-definitions.md`](../kpi-definitions.md) (§4 NPS).

---

## 1. Canali di raccolta feedback

| Canale | Trigger | Volume atteso |
|---|---|---|
| In-app feedback button | Click sull'icona feedback | Continuo |
| Email support | support@anlyra.it | Continuo |
| NPS survey (in-app) | Day 30 post-signup | 1×/utente/mese |
| Customer interviews | Founder-led, outbound | 5-10/mese |
| Churn survey | Post-cancellazione automatica | Ad ogni churn |

---

## 2. Triage workflow

Ogni feedback ricevuto viene categorizzato entro 48 ore:

### Categorie

| Categoria | Descrizione | Esempio |
|---|---|---|
| `bug` | Comportamento errato, errore | "L'export CSV è vuoto" |
| `ux` | Confusione, difficoltà d'uso | "Non capisco dove trovare gli alert" |
| `feature-request` | Funzionalità nuova | "Vorrei l'integrazione con Fatture in Cloud" |
| `performance` | Lentezza, timeout | "Il caricamento dashboard è troppo lento" |
| `billing` | Problema pagamento, piano | "Ho pagato ma non ho accesso Avanzato" |
| `compliment` | Feedback positivo | "Gli insight AI sono sorprendenti" |
| `other` | Non classificabile | |

### Priorità

| Priorità | Criteri | SLA azione |
|---|---|---|
| P0 — Critica | Bug che blocca funzionalità core, data loss | Stessa giornata |
| P1 — Alta | Bug significativo, richiesta ricorrente (3+ utenti) | 3 giorni lavorativi |
| P2 — Media | UX improvement, feature request singola | Nel prossimo sprint |
| P3 — Bassa | Nice-to-have, complimenti | Backlog |

### Owner assignment

- `bug`: dev owner (ingegnere di turno)
- `ux` + `feature-request`: prodotto (founder o PM futuro)
- `billing`: CS/founder
- `performance`: dev owner

---

## 3. Close the loop

Quando un feedback porta a un'azione concreta:

1. **Notifica utente**: email o in-app notification: "Il tuo feedback su [X] è stato preso in carico.
   [Abbiamo risolto il bug / Abbiamo aggiunto la feature / È in roadmap per Q[N]]."
2. **Tempistica**: entro 30 giorni dalla segnalazione, o alla release della fix.
3. **Tono**: personale, non template generico. Una riga autentica vale più di un paragrafo di boilerplate.

---

## 4. Feedback → roadmap influence

Processo mensile (ogni primo lunedì del mese):

1. Aggregare tutti i feedback del mese: conteggio per categoria + priorità.
2. Identificare i top 3 `feature-request` per frequenza.
3. Valutare impatto (quanti utenti colpiti) vs effort (giorni dev).
4. Portare il ranking al planning sprint/trimestre.
5. Aggiornare [`../roadmap.md`](../roadmap.md) con le decisioni prese.

---

## 5. Metriche feedback process

| Metrica | Target |
|---|---|
| % feedback con triage entro 48h | 100% |
| % P0/P1 con azione entro SLA | 100% |
| % utenti che ricevono close-the-loop | > 80% (per feedback con azione) |
| NPS trend (mensile) | In crescita |
| Feature da feedback in roadmap (%) | > 30% delle feature planned |

---

**Status**: operativo.  
**Last updated**: 2026-05-27.
