---
title: Anlyra · Cap Table Template
audience: founder, legal, investor
last_updated: 2026-05-26
status: planning document
---

# Cap Table Template

> Struttura della cap table per quando si avvia il fund-raising. Template da adattare con un avvocato prima dell'uso ufficiale.

**Nota**: questo è un template educativo. Qualsiasi cap table reale va redatta e validata da un avvocato specializzato in diritto societario italiano. **Non usare questo documento come documento legale.**

**Correlati**: [`financial-model-outline.md`](financial-model-outline.md).

---

## 1. Struttura della cap table

### Sezioni principali

| Sezione | Descrizione |
|---------|-------------|
| **Founders** | Quote dei fondatori (azioni ordinarie) |
| **Employee Option Pool** | Stock option riservate al team futuro |
| **Advisors** | Option per advisor strategici |
| **Investors — Pre-seed** | Investitori angel o round pre-seed |
| **Investors — Seed** | Round seed |
| **Investors — Serie A** | Round Serie A (futuro) |
| **Warrant / SAFE holders** | Strumenti convertibili |

---

## 2. Esempio cap table — pre-funding

| Holder | Tipo | Azioni | % fully diluted |
|--------|------|--------|----------------|
| Founder 1 | Ordinarie | 700.000 | 70% |
| Founder 2 | Ordinarie | 200.000 | 20% |
| Option Pool (non assegnate) | Option | 100.000 | 10% |
| **Totale** | | **1.000.000** | **100%** |

---

## 3. Esempio cap table — post round seed (ipotetico)

Assunzione: round seed da €500K a valutazione pre-money €2M.
- Pre-money shares: 1.000.000
- Nuove quote investor: 1.000.000 × (500K / 2M) = 250.000 nuove quote
- Post-money valuation: €2,5M
- Price per share: €2M / 1.000.000 = €2,00

| Holder | Tipo | Azioni | % post-money |
|--------|------|--------|-------------|
| Founder 1 | Ordinarie | 700.000 | 56% |
| Founder 2 | Ordinarie | 200.000 | 16% |
| Option Pool | Option | 100.000 | 8% |
| Investor Seed | Privilegiate | 250.000 | 20% |
| **Totale** | | **1.250.000** | **100%** |

**Diluizione founder**: da 90% combinato a 72% combinato — accettabile per round seed.

---

## 4. Pre-money vs Post-money valuation

| Concetto | Spiegazione | Esempio |
|----------|-------------|---------|
| **Pre-money valuation** | Valore dell'azienda prima dell'investimento | €2.000.000 |
| **Investimento** | Importo portato dall'investitore | €500.000 |
| **Post-money valuation** | Pre-money + Investimento | €2.500.000 |
| **% investor** | Investimento / Post-money | 500K / 2,5M = 20% |

**Regola**: negoziare sempre su valutazione pre-money, non post-money. "Pre-money €2M" e "post-money €2M" sono due cose molto diverse.

---

## 5. Dilution scenarios

### Scenario con opzione pool pre-money
Gli investitori spesso richiedono che l'option pool sia incluso nel pre-money (aumenta la diluizione per i founder).

**Senza opzione pool pre-money inclusa**:
- Investitore entra al 20%
- Founder diluiti solo dall'investitore

**Con opzione pool pre-money inclusa** (pool portato al 20% prima dell'investimento):
- Il pool esistente è 10% → da portare al 20% → emissione nuove option
- Solo dopo si calcola la diluizione da investimento
- Founder diluiti due volte

→ Negoziare la dimensione dell'option pool da creare pre-money. Un pool troppo grande diluisce i founder senza necessità immediata.

---

## 6. Strumenti di investimento

### Equity diretta (azioni)
**Quando usare**: round formali con valutazione concordata.
**Pro**: semplicità per tutti.
**Contro**: richiede valutazione definita, notaio, modifiche statuto.

### SAFE (Simple Agreement for Future Equity)
**Quando usare**: round pre-seed angel molto early stage, quando la valutazione è prematura.
**Pro**: veloce, economico, no interesse.
**Contro**: complessità al momento della conversione; in Italia la validità del SAFE va verificata con un avvocato (lo strumento è nato negli USA).
**Varianti**: SAFE con cap (valuation cap) + discount (tipicamente 15–25%).

### Convertible Note
**Quando usare**: bridge round o angel pre-seed con valutazione da determinare.
**Pro**: strumento legale noto anche in Italia.
**Contro**: accumula interesse (tipicamente 5–8% annuo); scade e va rimborsata se non converte.
**Termini tipici**: cap + discount + maturity 18–24 mesi.

### Quando usare quale
| Situazione | Strumento consigliato |
|------------|----------------------|
| Angel molto early, < €200K, velocità | SAFE o Convertible Note |
| Round seed con lead investor definito | Equity diretta |
| Bridge tra round | Convertible Note |
| Round Serie A+ | Equity con term sheet completo |

---

## 7. Advisor shares

Gli advisor ricevono solitamente option (non azioni ordinarie), con vesting 1–2 anni, cliff 3–6 mesi.

**Quantità tipica**: 0,1%–0,5% fully diluted per advisor strategico.
**Vesting**: mensile dopo il cliff, su 1–2 anni.
**Scadenza option**: 5–10 anni dall'emissione.

Esempio: advisor ottiene 5.000 option su 1.000.000 shares totali = 0,5%.
Con cliff 6 mesi e vesting 24 mesi: 0 dopo 6 mesi, poi 208 option/mese per 18 mesi.

---

## 8. Cap table providers raccomandati

### Carta (carta.com)
- Standard de facto negli USA, sempre più usato in Europa.
- Gestisce equity rounds, SAFEs, option grants, 409A.
- Integrazione con DocuSign per firma elettronica.
- Costo: gratuito fino a 25 azionisti, poi pricing variabile.

### Pulley (pulley.com)
- Alternativa a Carta, UI più semplice.
- Ottimo per early stage (< 50 azionisti).
- Pricing: startup-friendly.

### Fogli Excel / Google Sheets (early stage)
- Accettabile per i primi 6–12 mesi se hai < 10 azionisti e 0 round chiusi.
- Usare un template validato da avvocato.
- Passare a strumento dedicato prima del primo round istituzionale.

---

## 9. Pre-pitch checklist cap table

Prima di presentare la cap table a un investor:

- [ ] Aggiornata con tutti i holder (incluse option assegnate e non assegnate)
- [ ] Validata da avvocato societario italiano
- [ ] Coerente con lo statuto aziendale vigente
- [ ] Include tutti gli strumenti convertibili (SAFE, note) con cap e discount
- [ ] Scenari pre/post round mostrati chiaramente
- [ ] Dimensione option pool discussa e dichiarata (pre o post money)

---

**Status**: planning document. Prima del primo round, costruire la cap table reale su Carta o Pulley con supporto legale.
