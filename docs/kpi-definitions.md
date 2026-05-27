---
title: Anlyra · KPI Definitions
audience: developer + customer (educational)
status: living document
last_updated: 2026-05-27
---

# KPI Definitions

> Glossario operativo dei KPI che Anlyra calcola e mostra. Per ogni KPI: formula, significato
> business, esempio numerico, frequenza di calcolo. Doppio uso: riferimento per sviluppatori e
> contenuto educativo per i clienti.

**Documenti correlati**: [`glossary.md`](glossary.md), [`ai/prompt-library.md`](ai/prompt-library.md),
[`financial/unit-economics.md`](financial/unit-economics.md).

**Convenzione**: tutti i numeri vanno mostrati con **tabular nums** (vedi `CLAUDE.md` §0).

---

## 1. Revenue (10 KPI)

| KPI | Formula | Significato | Esempio | Frequenza |
|---|---|---|---|---|
| Total Revenue | Σ ricavi periodo | Fatturato totale | €120.000 / mese | Mensile |
| MRR | ricavi ricorrenti mensili | Ricavo ricorrente prevedibile | €48.000 | Mensile |
| ARR | MRR × 12 | Run-rate annuale | €576.000 | Mensile |
| ARPU | Revenue ÷ utenti attivi | Ricavo medio per utente | €75 | Mensile |
| Revenue per channel | ricavi ÷ canale | Mix canali | Diretto 60% | Mensile |
| Net Revenue | Revenue − resi/sconti | Ricavo netto reale | €112.000 | Mensile |
| New MRR | MRR da nuovi clienti | Crescita acquisizione | €6.000 | Mensile |
| Expansion MRR | MRR da upgrade | Crescita base esistente | €2.500 | Mensile |
| Churned MRR | MRR perso | Erosione ricavo | −€1.800 | Mensile |
| Net MRR Growth | New + Exp − Churn | Crescita netta ricorrente | +€6.700 | Mensile |

---

## 2. Cash (8 KPI)

| KPI | Formula | Significato | Esempio | Frequenza |
|---|---|---|---|---|
| Cash balance | liquidità disponibile | Cassa attuale | €210.000 | Giornaliera |
| Cash flow | entrate − uscite | Flusso netto periodo | +€14.000 | Mensile |
| Burn rate | cassa bruciata/mese | Consumo netto mensile | €25.000 | Mensile |
| Runway | cassa ÷ burn rate | Mesi di autonomia | 8,4 mesi | Mensile |
| DSO | (crediti ÷ ricavi) × giorni | Giorni medi incasso | 42 giorni | Mensile |
| DPO | (debiti ÷ acquisti) × giorni | Giorni medi pagamento | 30 giorni | Mensile |
| Operating cash flow | flusso da operatività | Cassa generata dal core | +€18.000 | Mensile |
| Free cash flow | OCF − capex | Cassa libera | +€12.000 | Mensile |

---

## 3. Margin (6 KPI)

| KPI | Formula | Significato | Esempio | Frequenza |
|---|---|---|---|---|
| Gross margin | (Ricavi − COGS) ÷ Ricavi | Marginalità lorda | 78% | Mensile |
| Net margin | Utile netto ÷ Ricavi | Marginalità netta | 12% | Mensile |
| COGS | costo del venduto | Costo diretto prodotti/servizi | €26.400 | Mensile |
| Contribution margin | Ricavi − costi variabili | Contributo alla copertura fissi | €82.000 | Mensile |
| EBITDA margin | EBITDA ÷ Ricavi | Redditività operativa | 18% | Trimestrale |
| Operating margin | Utile operativo ÷ Ricavi | Efficienza operativa | 15% | Mensile |

---

## 4. Customers (8 KPI)

| KPI | Formula | Significato | Esempio | Frequenza |
|---|---|---|---|---|
| Total customers | clienti attivi | Base clienti | 640 | Mensile |
| New customers | nuovi nel periodo | Acquisizione | 48 | Mensile |
| Active customers | clienti con attività | Engagement reale | 590 | Mensile |
| Churn rate | persi ÷ totale inizio | Tasso abbandono | 4,0% | Mensile |
| CAC | spesa acquisizione ÷ nuovi clienti | Costo acquisizione | €150 | Mensile |
| LTV | ARPU × margine × vita media | Valore vita cliente | €1.350 | Trimestrale |
| Conversion rate | trial→paid ÷ trial | Efficacia funnel | 22% | Mensile |
| NPS | %promoter − %detractor | Soddisfazione/raccomandazione | +42 | Trimestrale |

---

## 5. Operations (6 KPI)

| KPI | Formula | Significato | Esempio | Frequenza |
|---|---|---|---|---|
| Order volume | n. ordini periodo | Volume operativo | 1.250 | Mensile |
| AOV | ricavi ÷ ordini | Valore medio ordine | €96 | Mensile |
| Inventory turnover | COGS ÷ scorte medie | Rotazione magazzino | 6,2× / anno | Trimestrale |
| On-time delivery | consegne puntuali ÷ totali | Affidabilità logistica | 94% | Mensile |
| Defect rate | difettosi ÷ totali | Qualità | 1,2% | Mensile |
| Customer satisfaction (CSAT) | %soddisfatti | Soddisfazione interazione | 88% | Mensile |

---

## 6. Marketing (5 KPI)

| KPI | Formula | Significato | Esempio | Frequenza |
|---|---|---|---|---|
| Traffic | visite uniche | Top of funnel | 14.000 / mese | Mensile |
| Conversion funnel | %step→step | Efficienza percorso | Visit→trial 3% | Mensile |
| CAC per channel | spesa canale ÷ clienti canale | Efficienza canale | SEO €90 | Mensile |
| ROI campaigns | (ricavo − spesa) ÷ spesa | Resa campagne | 3,2× | Per campagna |
| Brand awareness | reach/menzioni | Notorietà | +15% QoQ | Trimestrale |

---

## 7. Team (5 KPI)

| KPI | Formula | Significato | Esempio | Frequenza |
|---|---|---|---|---|
| Headcount | n. dipendenti | Dimensione team | 6 | Mensile |
| Cost per employee | costo personale ÷ headcount | Costo medio | €4.200 / mese | Mensile |
| Productivity per employee | Revenue ÷ headcount | Ricavo per testa | €20.000 / mese | Mensile |
| Retention | (1 − turnover) | Trattenimento talenti | 92% | Annuale |
| Engagement | indice survey interno | Coinvolgimento | 7,8/10 | Trimestrale |

---

## Totale: 48 KPI in 7 categorie

Revenue 10 · Cash 8 · Margin 6 · Customers 8 · Operations 6 · Marketing 5 · Team 5.

> Nota: la disponibilità di ciascun KPI dipende dai dati caricati dal cliente. KPI di categoria
> Operations/Team sono opzionali e mostrati solo se i dati relativi sono presenti.

---

**Status**: living document.  
**Last updated**: 2026-05-27.  
**Audience**: developer (implementazione calcoli) + customer (educational).
