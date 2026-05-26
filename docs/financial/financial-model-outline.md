---
title: Anlyra · Financial Model Outline
audience: founder, investor
last_updated: 2026-05-26
status: planning document
---

# Financial Model Outline

> Struttura dello spreadsheet finanziario da costruire. Questo documento descrive i fogli e le logiche — non lo spreadsheet stesso.

**Correlati**: [`unit-economics.md`](unit-economics.md), [`cap-table-template.md`](cap-table-template.md).

---

## Principi del modello

- **Bottoms-up, non top-down.** Partire da assunzioni concrete (quante email invio, quanti lead genero, conversion rate) — non da "conquisto l'1% del mercato".
- **Assunzioni esplicite.** Ogni input deve essere in un foglio dedicato, non hardcoded nelle formule.
- **Tre scenari.** Base / Ottimistico / Pessimistico — non solo quello che speravi.
- **Aggiornato mensilmente.** Il modello è vivo, non un documento da fare una volta e dimenticare.
- **Orizzonte: 24 mesi.** Colonne mensili, non trimestrali (il dettaglio conta nella fase early).

---

## Sheet 1 — Assumptions

Foglio di input centrale. Tutte le variabili del modello vengono da qui.

### Revenue assumptions
| Variabile | Valore base | Note |
|-----------|-------------|------|
| Prezzo PRO mensile | €49 | Fisso da `src/lib/billing/plans.ts` |
| Prezzo Avanzato mensile | €149 | Fisso da `src/lib/billing/plans.ts` |
| Prezzo annuale PRO | €490 | Sconto ~17% |
| Prezzo annuale Avanzato | €1.490 | Sconto ~17% |
| % clienti su piano annuale | [%] | Ipotesi: 30–40% dopo 6 mesi |
| % piano PRO vs Avanzato | [%] vs [%] | Ipotesi: 70% PRO, 30% Avanzato |
| Credit pack ARPU aggiuntivo | €[da definire] | Vedi `docs/decisions/credit-pack-pricing.md` |

### Acquisition assumptions
| Variabile | Valore base | Note |
|-----------|-------------|------|
| Visitatori sito/mese | [N] | Da Google Analytics |
| Trial signup rate | [%] | Visitatori → trial (ipotesi: 2–4%) |
| Trial-to-paid conversion | [%] | Ipotesi: 20–30% |
| Trial duration | 7 giorni | Fisso |
| Churn mensile PRO | [%] | Target: < 4% |
| Churn mensile Avanzato | [%] | Target: < 2% |

### Cost assumptions
| Variabile | Valore base | Note |
|-----------|-------------|------|
| Infra mensile (Vercel + Supabase) | €[N] | Da fatture reali |
| Anthropic API cost/cliente/mese | €[N] | Da usage reale |
| Resend email cost/mese | €[N] | Da fatture reali |
| Stripe fee % | 1,4% + €0,25 (EU cards) | Standard Stripe |
| Salary founder | €[N] | 0 in pre-revenue, poi definire |
| First hire (developer) | €[N] | Pianificato post-funding |
| Marketing budget mensile | €[N] | % del MRR o fisso |
| Legal + accounting | €[N] | Annuale / 12 |

---

## Sheet 2 — Revenue Projection (24 mesi)

Modello di revenue bottoms-up, colonne mensili.

### Logica funnel (per ogni mese)
```
Visitatori → × Trial Signup Rate → Nuovi Trial
Nuovi Trial → × Trial-to-Paid Rate → Nuovi Clienti Paganti
+ Clienti esistenti × (1 - Churn Rate) → Clienti Attivi
Clienti Attivi × ARPU = MRR del mese
```

### Output per mese
- Nuovi trial avviati
- Nuovi clienti paganti (PRO + Avanzato)
- Clienti persi (churn)
- Clienti attivi totali (fine mese)
- MRR (fine mese)
- ARR run-rate (MRR × 12)
- New MRR, Churned MRR, Net New MRR

### Milestone evidenziate
- Mese del primo €1.000 MRR
- Mese del primo €5.000 MRR
- Mese del primo €10.000 MRR
- Mese di break-even (vedi Sheet 4)

---

## Sheet 3 — Costs (24 mesi)

### Costi fissi mensili
- Infra (Vercel, Supabase, servizi terzi)
- Stipendi (founder, team)
- Legale + accounting
- Tool e software (abbonamenti business)
- Ufficio / coworking (se applicabile)

### Costi variabili (proporzionali al volume)
- Anthropic API: proporzione al numero di AI credits usati
- Stripe fee: proporzione al revenue processato
- Resend: proporzione al numero di email inviate
- Support (tempo ore, se externalizzato)

### Costi one-time
- Setup legale (costituzione SRL, contratti)
- Design / brand (una tantum)
- Development (feature grandi, se esternalizzate)

### Grafico burn
- Burn mensile = Costi totali − Revenue
- Burn cumulativo = runway
- Linea break-even visible nel grafico

---

## Sheet 4 — P&L Mensile

Profit & Loss semplificato, per mese.

```
Revenue (MRR)
- Cost of Revenue (infra, API, Stripe fee)
= Gross Profit
- Operating Expenses (stipendi, marketing, legal, tool)
= EBITDA
- Ammortamenti (se applicabili)
= EBIT
```

**Gross Margin** = Gross Profit / Revenue — target: 70–80%
**EBITDA Margin** — negativo early stage, target break-even entro [mese X]

---

## Sheet 5 — Cash Flow + Runway

### Cash flow mensile
```
Cash inizio mese
+ Revenue incassata (pagamenti Stripe)
- Pagamenti fornitori (fatture del mese)
- Stipendi pagati
= Cash fine mese
```

**Nota**: distinguere competenza (P&L) da cassa (cash flow). Un cliente annuale pagato upfront migliora il cash ma non il MRR del mese.

### Runway
- **Cash attuale**: €[N] (da aggiornare)
- **Burn mensile medio**: €[N] (da Sheet 3)
- **Runway stimato**: Cash / Burn = [N] mesi
- **Target**: mantenere sempre ≥ 12 mesi di runway

### Milestones per round
- Round seed: abbastanza runway da raggiungere [milestone X]
- Milestone X = [N] MRR / [N] clienti / break-even

---

## Sheet 6 — Scenario Sensitivity

Tre scenari dichiarati con assunzioni diverse:

### Scenario Base
Assunzioni conservative-realistiche. Il modello "più probabile".
- Trial signup rate: [%]
- Trial-to-paid: [%]
- Churn: [%]

### Scenario Ottimistico
Tutto va bene: la partnership decolla, il contenuto funziona, churn basso.
- Trial signup rate: +50% vs base
- Trial-to-paid: +30% vs base
- Churn: −30% vs base

### Scenario Pessimistico
Acquisizione lenta, churn più alto del previsto.
- Trial signup rate: −30% vs base
- Trial-to-paid: −25% vs base
- Churn: +50% vs base

### Output per scenario (mese 12 e mese 24)
| Metrica | Pessimistico | Base | Ottimistico |
|---------|-------------|------|-------------|
| MRR mese 12 | €[N] | €[N] | €[N] |
| Clienti mese 12 | [N] | [N] | [N] |
| Runway rimanente | [N] mesi | [N] mesi | [N] mesi |
| Break-even | mese [N] | mese [N] | mese [N] |

---

## Note di costruzione

### Tool raccomandato
Google Sheets (collaborativo, senza software aggiuntivo). Alternativa: Excel.

### Struttura consigliata dei fogli
`Assumptions` → `Revenue` → `Costs` → `P&L` → `Cash Flow` → `Scenarios` → `Charts`

### Versioning
- Naming: `anlyra-financial-model-YYYY-MM.xlsx` — una versione per mese.
- Non sovrascrivere le versioni precedenti: utili per vedere come le assunzioni sono cambiate.
- Condividere solo la versione corrente con gli investor; archiviare le vecchie in una cartella separata.

---

**Status**: planning document. Costruire lo spreadsheet reale entro il round seed. Aggiornare le assunzioni ogni mese con dati reali.
