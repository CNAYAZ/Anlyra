# Decision Log: Credit Pack Pricing

## Status: 🟡 Open

## Context

Anlyra offre 3 piani ricorrenti (Pro €49/mese, Avanzato €149/mese, Enterprise custom).
Inoltre vuole offrire **credit pack one-time** per:

- Clienti che superano i crediti mensili inclusi nel piano e non vogliono upgradare
- Utilizzo occasionale/spot senza committment ricorrente

Le quantità sono confermate: **50, 200, 500 crediti**.
I prezzi sono in fase di decisione.

## Decision needed

Quale strategia di pricing applicare ai credit pack one-time?

---

## Options

### Option A — Premium pricing (€19 / €59 / €129)

| Pack     | Crediti | Prezzo | €/credito |
|----------|--------:|-------:|----------:|
| Starter  | 50      | €19    | €0.38     |
| Medium   | 200     | €59    | €0.30     |
| Large    | 500     | €129   | €0.26     |

Sconto volume: Medium -21%, Large -32% rispetto a Starter.

**Pros**:
- Coerente con positioning premium Anlyra
- Margine alto sostiene i costi AI (Anthropic Claude per token)
- Il credit pack è percepito come soluzione d'emergenza, non alternativa ai piani
- Incentiva upgrade: Pro €49 include 200 crediti vs €59 per soli 200 crediti top-up

**Cons**:
- Meno appetibili per low-volume occasional users
- Possibile pushback da customer feedback sul valore percepito

---

### Option B — Accessible pricing (€9 / €29 / €59)

| Pack     | Crediti | Prezzo | €/credito |
|----------|--------:|-------:|----------:|
| Starter  | 50      | €9     | €0.18     |
| Medium   | 200     | €29    | €0.145    |
| Large    | 500     | €59    | €0.118    |

Sconto volume: Medium -19%, Large -34% rispetto a Starter.

**Pros**:
- Più accessibili per occasional users
- Possibile lever di lead acquisition (entry low → upgrade successivo)
- Allineamento con i valori in `plans.ts` al momento della stesura del codice

**Cons**:
- Cannibalizza l'upgrade ai piani: Pro €49 per 200 crediti vs €29 top-up per 200 crediti (perché upgradare?)
- Margine basso se il costo per credito AI (Anthropic) è elevato
- Incoerente con positioning premium
- Rischio di percepire Anlyra come "low-cost startup"

---

### Option C — Hybrid pricing (€15 / €39 / €89)

| Pack     | Crediti | Prezzo | €/credito |
|----------|--------:|-------:|----------:|
| Starter  | 50      | €15    | €0.30     |
| Medium   | 200     | €39    | €0.195    |
| Large    | 500     | €89    | €0.178    |

Sconto volume: Medium -35%, Large -41% rispetto a Starter.

Compromesso tra Option A e B: pricing premium-accessible con sconto volume più aggressivo.

---

## Decision criteria

Per decidere è necessario:

1. **Costo per credito AI** — analisi del costo reale Anthropic Claude per token per richiesta media
2. **Customer interviews** — disponibilità a pagare (willingness to pay) su un campione di early adopters
3. **Competitor benchmark** — cosa offrono prodotti simili (Datafox, Visible, ChartHop, ecc.)
4. **Strategic positioning** — premium (coerente con brand) vs accessible (volume/growth)
5. **Unit economics** — margine di contribuzione per credito venduto vs costo di acquisizione

## Implicazioni sul codice

Una volta decisa l'opzione, aggiornare:
- `src/lib/billing/plans.ts` → `CREDIT_PACKS[].priceCents`
- `docs/FAQ.md` → sostituire `€[da definire]` con prezzi finali
- `docs/stripe-setup.md` → sostituire `€[da definire]` con prezzi finali
- Creare i prodotti Stripe con i prezzi definitivi e aggiornare `.env.example`

## Timeline

- **Pre-launch commerciale** (entro 30 giorni dal go-live Stripe in production)
- Re-valutazione dopo 90 giorni di traction (price sensitivity analysis data-driven)

---

## Decision (TBD)

> [Decisione finale — opzione scelta + razionale + data]

---

**Created**: 2026-05-25
**Decision owner**: [Fondatore Anlyra]
**Reviewers**: [da definire]
