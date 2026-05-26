---
title: Anlyra · Unit Economics
audience: founder, investor
last_updated: 2026-05-26
status: living document
---

# Unit Economics

> Framework per misurare la salute finanziaria per cliente. Tutti i valori con [placeholder] vanno compilati con dati reali prima di ogni pitch o board review.

**Correlati**: [`financial-model-outline.md`](financial-model-outline.md), [`sales-pitch-deck-outline.md`](../sales-pitch-deck-outline.md).

---

## 1. CAC — Customer Acquisition Cost

**Formula**: CAC = (Spesa totale sales + marketing nel periodo) / Nuovi clienti acquisiti nel periodo

### Breakdown per canale

| Canale | Costo stimato CAC | Note |
|--------|-------------------|------|
| Organico (SEO/contenuti) | Basso (solo tempo) | Risultati a 6–12 mesi |
| Google Ads | €[placeholder] | Cost-per-click + conversion rate |
| LinkedIn Ads | €[placeholder] | Più costoso, targeting B2B preciso |
| Partnership (commercialisti) | < €[placeholder] | CAC basso, trust alto |
| Affiliazione | €[placeholder] | Variabile, allineato al successo |
| Events / webinar | €[placeholder] | Difficile da misurare, brand building |

### Target CAC per piano

| Piano | CAC target | Razionale |
|-------|-----------|-----------|
| PRO | < €100 | LTV sufficiente per recupero in < 6 mesi |
| Avanzato | < €300 | LTV più alto, payback < 9 mesi accettabile |
| Enterprise | < €2.000 | Ciclo di vendita lungo, LTV molto alto |

**CAC attuale**: €[placeholder] — da calcolare a partire dal primo mese con dati reali.

---

## 2. LTV — Lifetime Value

**Formula**: LTV = ARPU × Gross Margin % × (1 / Churn Rate mensile)

Dove:
- **ARPU** (Average Revenue Per User): ricavi medi per cliente attivo al mese
- **Gross Margin**: circa 70–80% per SaaS (infra + support, no COGS pesante)
- **Churn Rate**: % di clienti che cancellano ogni mese

### Target LTV per piano (con assunzioni dichiarate)

| Piano | ARPU mensile | Gross Margin | Churn target | Avg lifetime | LTV stimato |
|-------|-------------|-------------|-------------|-------------|-------------|
| PRO | €49 | 75% | 3%/mese | 33 mesi | **~€1.213** |
| Avanzato | €149 | 78% | 2%/mese | 50 mesi | **~€5.801** |
| Enterprise | Custom | 80% | 1%/mese | 100 mesi | Custom |

**Nota**: queste sono stime basate su benchmark SaaS B2B italiani. I valori reali vanno tracciati dal primo trimestre di revenue.

---

## 3. LTV/CAC ratio

**Target sano**: LTV/CAC ≥ 3x
**Target eccellente**: LTV/CAC ≥ 5x
**Segnale di allarme**: LTV/CAC < 2x (spendi più di quanto guadagni per cliente)

| Piano | LTV stimato | CAC target | Ratio stimato |
|-------|-------------|-----------|--------------|
| PRO | €1.213 | €100 | **12x** |
| Avanzato | €5.801 | €300 | **19x** |
| Enterprise | Custom | €2.000 | Custom |

I ratio stimati sembrano eccellenti perché il CAC target è conservativo (principalmente organico). Quando si scala il paid, il CAC salirà — monitorare il ratio mensile.

---

## 4. Payback Period

**Formula**: Payback = CAC / (ARPU mensile × Gross Margin %)

**Target**: < 12 mesi per piani PRO/Avanzato, < 24 mesi per Enterprise.

| Piano | CAC | ARPU × GM | Payback stimato |
|-------|-----|-----------|----------------|
| PRO | €100 | €36,75 | **~3 mesi** |
| Avanzato | €300 | €116,22 | **~3 mesi** |

Con CAC organico il payback è eccellente. Con paid ads, il CAC sale e il payback si allunga — accettabile fin sotto i 12 mesi.

---

## 5. Cohort Analysis — template

Per ogni coorte mensile di clienti acquisiti, tracciare:

| Metrica | Mese 1 | Mese 3 | Mese 6 | Mese 12 |
|---------|--------|--------|--------|---------|
| Clienti rimanenti | 100% | [%] | [%] | [%] |
| MRR rimanente | 100% | [%] | [%] | [%] |
| NRR (Net Revenue Retention) | — | [%] | [%] | [%] |

**Target NRR**: ≥ 100% (espansione compensa churn). NRR > 110% = eccellente.

La cohort analysis diventa significativa con almeno 3–4 mesi di dati per coorte. Iniziare a tracciare dal primo mese di revenue.

---

## 6. SaaS Metrics Dashboard

Metriche da monitorare mensilmente (dashboard interna):

### Revenue
- **MRR** (Monthly Recurring Revenue) — totale abbonamenti attivi
- **ARR** (Annual Recurring Revenue) — MRR × 12
- **New MRR** — da nuovi clienti nel mese
- **Expansion MRR** — da upgrade di clienti esistenti
- **Contraction MRR** — da downgrade
- **Churned MRR** — da cancellazioni
- **Net New MRR** = New + Expansion − Contraction − Churned

### Clienti
- **Clienti attivi totali** (paying, non trial)
- **Nuovi clienti** nel mese
- **Clienti in churn** nel mese
- **Churn rate** mensile (clienti) = Churned / Active inizio mese
- **Revenue Churn** mensile = Churned MRR / MRR inizio mese

### Crescita
- **MRR Growth Rate** mese su mese
- **Trial-to-paid conversion rate** = Clienti paganti / Trial iniziati (stesso periodo)
- **Time-to-convert** = giorni medi da trial start a primo pagamento

### Efficienza
- **CAC** per canale (richiede tracking)
- **LTV/CAC ratio** per piano
- **Payback period** per piano
- **Burn multiple** = Net Burn / Net New ARR (< 1 = efficiente, > 2 = attenzione)

---

## 7. Benchmark SaaS B2B Italia

Valori di riferimento per SaaS verticale B2B nel mercato italiano (PMI target):

| Metrica | Early stage | Growth stage | Fonte |
|---------|-------------|-------------|-------|
| Churn mensile | 5–8% | 2–4% | SaaS Capital |
| NRR | 95–105% | 110–130% | Bessemer |
| Trial-to-paid | 15–25% | 25–40% | Profitwell |
| CAC payback | 12–18 mesi | 6–12 mesi | OpenView |
| LTV/CAC | 2–3x | 3–5x | SaaS Capital |

**Nota**: i benchmark italiani sono meno pubblicati. Usare quelli europei come proxy, considerando che il mercato PMI italiano ha cicli decisionali più lunghi e churn potenzialmente più alto nella fase iniziale.

---

**Status**: living document. Aggiornare con dati reali ogni trimestre. I placeholder vanno sostituiti prima di ogni investor meeting.
