---
title: Anlyra · Pricing Strategy Analysis
audience: founder (decisione pricing finale)
status: living document · internal · decision-pending
last_updated: 2026-05-27
---

# Pricing Strategy Analysis

> Analisi completa per la decisione di pricing finale di Anlyra. Documento di lavoro, non
> definitivo: la raccomandazione finale è **subordinata alle customer interviews** (vedi
> [`customer-interview-template.md`](customer-interview-template.md)).

**Documenti correlati**: [`competitor-analysis.md`](competitor-analysis.md),
[`decisions/credit-pack-pricing.md`](decisions/credit-pack-pricing.md),
[`financial/unit-economics.md`](financial/unit-economics.md).

**Stato attuale (placeholder)**: Pro €49/mese, Avanzato €149/mese, Enterprise custom. I numeri
qui sotto sono scenari di analisi, non prezzi confermati.

---

## 1. Competitor pricing benchmark

| Competitor | Categoria | Pricing entry | Pricing mid | Target |
|---|---|---|---|---|
| QuickBooks | Accounting + report | ~€15/mese | ~€35/mese | Micro/PMI |
| Xero | Accounting + analytics | ~€16/mese | ~€55/mese | PMI |
| ChartHop | People/HR analytics | ~$$$ | ~$$$$ | Mid-market US |
| Klipfolio | KPI dashboard | ~€25/mese | ~€80/mese | SMB |
| Pulse Software | KPI tracking PMI | ~€40/mese | ~€120/mese | PMI UK |
| Visible | Investor reporting | ~€50/mese | ~€150/mese | Startup |

**Lettura**: il segmento "analytics PMI con AI" è scoperto. QuickBooks/Xero sono accounting con
report bolt-on; Klipfolio/Pulse sono dashboard senza AI nativa; Visible è investor-reporting, non
operational. Anlyra ha spazio per un posizionamento "AI advisor operativo" a metà fascia.

---

## 2. Positioning: premium vs accessible

- **Premium** (€69 Pro / €199 Avanzato): segnala qualità enterprise, sostiene margini AI, attrae
  PMI strutturate. Rischio: barriera all'ingresso per micro-PMI.
- **Accessible** (€39 Pro / €99 Avanzato): massimizza top-of-funnel, accelera adoption. Rischio:
  margini sotto pressione dato il costo per-insight Anthropic, percezione "tool economico".

Coerente con il valore brand "Trasparenza pricing" (vedi [`brand-guidelines.md`](brand-guidelines.md)):
qualunque scelta, **3 piani chiari, nessun asterisco, prezzo visibile al primo click**.

---

## 3. Scenari pricing — Pro tier

| Opzione | Prezzo/mese | Posizionamento | Crediti inclusi (ipotesi) |
|---|---|---|---|
| Pro-A | €39 | Accessible, top-of-funnel | 100 |
| Pro-B | €49 | Bilanciato (placeholder attuale) | 200 |
| Pro-C | €69 | Premium, qualità percepita | 250 |

---

## 4. Scenari pricing — Avanzato tier

| Opzione | Prezzo/mese | Posizionamento | Crediti inclusi (ipotesi) |
|---|---|---|---|
| Av-A | €99 | Accessible upgrade | 500 |
| Av-B | €149 | Bilanciato (placeholder attuale) | 800 |
| Av-C | €199 | Premium full | 1200 |

---

## 5. Scenario Enterprise

- Custom **da €499/mese**, contratto annuale, fatturazione su preventivo.
- Include: utenti illimitati, org illimitate, SLA, onboarding dedicato, DPA custom, SSO.
- Nessun prezzo pubblico (unica eccezione al principio "no contact sales" — vedi brand value 5).

---

## 6. Scenari plan limits

| Scenario | Pro (utenti/org) | Avanzato (utenti/org) | Enterprise |
|---|---|---|---|
| Conservative | 5 | 15 | unlimited |
| **Recommended** | 3 | 10 | unlimited |
| Aggressive | 2 | 7 | unlimited |

Configurabili via env vars già predisposte (`PLAN_PRO_USERS_PER_ORG`, `PLAN_ADVANCED_USERS_PER_ORG`,
ecc.) — nessun deploy codice richiesto per cambiare i limiti.

---

## 7. Scenari multi-org per tier

| Tier | Org per utente (Conservative) | Recommended | Aggressive |
|---|---|---|---|
| Pro | 2 | 1 | 1 |
| Avanzato | 5 | 3 | 2 |
| Enterprise | unlimited | unlimited | unlimited |

Il multi-org è abilitato tecnicamente via il modello `Membership` esistente (FASE D). La leva di
pricing è quante org un singolo account può possedere/amministrare.

---

## 8. Scenari credit pack

Rimando al decision log dedicato ([`decisions/credit-pack-pricing.md`](decisions/credit-pack-pricing.md)).
Sintesi quantità confermate: **50 / 200 / 500 crediti**.

| Opzione | 50 | 200 | 500 | Logica |
|---|---|---|---|---|
| A — Premium | €19 | €59 | €129 | Margine alto, incentiva upgrade piano |
| B — Accessible | €9 | €29 | €59 | Volume, occasional users |
| C — Hybrid | €14 | €44 | €94 | Compromesso |

---

## 9. Annual discount strategy

| Sconto | Mesi gratis equivalenti | Effetto |
|---|---|---|
| 15% | ~1.8 | Conservativo, protegge ARPU |
| **20%** | ~2.4 | Standard di mercato SaaS |
| 25% | ~3.0 | Aggressivo, massimizza cash upfront + retention |

Lo sconto annuale migliora cash flow e riduce churn, ma comprime ARR riconosciuto per cliente.

---

## 10. Unit economics per scenario (stime)

> Numeri illustrativi da validare con [`financial/unit-economics.md`](financial/unit-economics.md).

| Metrica | Accessible | Bilanciato | Premium |
|---|---|---|---|
| ARPU mensile (blended) | ~€55 | ~€75 | ~€110 |
| Gross margin stimato | 70-75% | 78-82% | 83-87% |
| Payback period (CAC ipotesi €150) | ~4 mesi | ~3 mesi | ~2 mesi |
| LTV/CAC (churn 4%/mese) | ~6x | ~8x | ~11x |

Il driver di margine è il costo per-insight Anthropic: piano premium assorbe meglio il costo AI.

---

## 11. Decision framework — 5 domande chiave

1. **Chi è il cliente prioritario** nei primi 12 mesi: micro-PMI (accessible) o PMI strutturata (premium)?
2. **Qual è il costo reale per-insight** una volta misurato in produzione (impatta margine minimo sostenibile)?
3. **Le customer interviews** indicano una soglia "troppo caro" sotto o sopra €49?
4. **Quanto è elastica la conversione** trial→paid rispetto al prezzo (testabile post-beta)?
5. **Il credit pack** è soluzione d'emergenza (premium) o canale di acquisizione (accessible)?

---

## 12. Raccomandazione finale (pendente interviews)

**Ipotesi di lavoro** (da confermare): scenario **Bilanciato** (Pro €49 / Avanzato €149),
plan limits **Recommended** (3/10/unlimited), credit pack **Option A premium**, sconto annuale **20%**.

Questa combinazione protegge i margini AI, mantiene il prezzo d'ingresso accessibile, e usa il
credit pack come incentivo all'upgrade. **Nessuna decisione è finale** finché non si completano
le 5-10 customer interviews e non si misura il costo per-insight in produzione.

---

**Status**: living document · decisione aperta.  
**Next action**: completare customer interviews → misurare costo AI → finalizzare in decision log.
