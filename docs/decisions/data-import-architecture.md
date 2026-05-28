# Decision Log: DATA-001 — Import Architecture & AI Privacy

## Status: ✅ Decided

## Context

Anlyra è una piattaforma B2B SaaS analytics + AI advisory per PMI italiane. Il prodotto richiede
dati finanziari/operativi del cliente per generare insight, alert, forecast e suggerimenti operativi
tramite Anthropic Claude.

Decisione necessaria su 2 aspetti core interdipendenti:
1. **Come Anlyra acquisisce i dati cliente** (manual upload vs API integrations vs banking direct)
2. **Cosa l'AI vede vs cosa rimane interno** (privacy boundary AI ↔ server ↔ cliente)

Vincoli founder espliciti:
- Minimo numero di passaggi per il cliente (no friction onboarding)
- Sistema **unico predeterminato** (no scelta utente)
- AI non deve vedere PII bancario sensibile (nomi controparti, IBAN, causali grezze)
- Promessa marketing onesta (no false claims)
- Sostenibile come startup pre-launch (no app mobile costosa)

---

## Options considered

### Option A — Privacy massima via app mobile + notifiche

Cliente installa app mobile Anlyra che legge notifiche push della banca. Anlyra-server non vede
mai i conti.

- **Pro**: privacy assoluta, server "cieco" sui dati bancari.
- **Contro**: richiede sviluppo iOS + Android (costo enorme pre-launch); funziona solo con
  notifiche banca attive; no web.
- **Esito**: ❌ Scartato — costo sviluppo non sostenibile.

### Option B base — PSD2 senza differenziazione AI

PSD2 banking via TrueLayer/Tink, dati transazioni in sync automatico, AI accede a tutto.

- **Pro**: import automatico.
- **Contro**: AI vede PII bancario → problemi GDPR Art. 9 + trasferimento internazionale dati a
  Anthropic US; promessa privacy violata.
- **Esito**: ❌ Scartato — incompatibile con principio privacy founder.

### Option C — Ibrido con scelta utente (CSV / QuickBooks / PSD2)

Cliente sceglie quale livello import vs privacy preferisce.

- **Pro**: flessibile.
- **Contro**: friction onboarding; prodotto frammentato; "scelta" è onere cognitivo per il cliente.
- **Esito**: ❌ Scartato — viola vincolo "sistema unico predeterminato".

### Option D — PSD2 + anonimizzazione deterministica + AI cieca su PII ⭐ SCELTA

Auto-import via PSD2, anonimizzazione server-side prima del DB, AI riceve solo aggregati +
categorie.

---

## Decision (DATA-001)

**Adottiamo Option D.**

### Architettura import

- **Source**: PSD2 banking via provider (TrueLayer / Tink / GoCardless Open Banking — selezione
  definitiva in fase implementazione, vedi
  [`docs/integrations/psd2-banking-integration-plan.md`](psd2-banking-integration-plan.md)).
- **Onboarding**: cliente clicca "Collega banca" durante setup org, flow PSD2 standardizzato
  ~60 secondi (vedi [`docs/onboarding-flow.md`](../onboarding-flow.md) §4.3).
- **Sync**: automatico ogni notte, recupero transazioni nuove.
- **Fallback**: per banche italiane minori non PSD2-compatibili, upload CSV manuale (eccezione
  documentata, non default).
- **Multi-banca**: cliente può collegare più conti (es. conto aziendale + conto corrente separati).

### Anonimizzazione server-side (CRITICAL)

Pipeline deterministica (**NO AI** in questa fase) che processa le transazioni prima del write
in DB cliente. Trasformazioni applicate:

| Campo originale | Trattamento | Salvato in DB |
|---|---|---|
| Controparte testuale (es. "MARIO ROSSI SRL") | Hash deterministico per-org (HMAC o SHA-256 + salt) per categorizzazione + lookup | Hash, non testo |
| IBAN | Scartato, non salvato | ❌ Mai |
| Causale grezza | Estrazione keywords + tag categoria; testo libero scartato | Keywords + categoria |
| Importo + data + valuta | Preservati integralmente | ✅ Sì |
| ID transazione banca | Preservato per idempotenza sync | ✅ Sì |

Dati completi originali: visibili al cliente in dashboard (sono i suoi dati), salvati con
encryption at rest in DB cliente.

### AI access boundary

Anthropic Claude (cloud US) riceve **SOLO**:

- Aggregati — es. `"Ricavi marketing Q3: €18.500, +12% vs Q2"`
- Categorie — es. `"Spese stipendi: €5.200"`
- Trend numerici — es. `"Burn rate mensile: €15k, runway 8 mesi"`
- Pattern aggregati — es. `"47 transazioni in categoria 'fornitori IT', media €450"`

Anthropic Claude **NON riceve MAI**:

- Nomi controparti (fornitori, clienti)
- IBAN
- Causali grezze
- Singole transazioni con identificazione PII

Pattern di prompt da rispettare documentati in
[`docs/ai/prompt-library.md`](../ai/prompt-library.md).

### Cliente in dashboard

- Vede sempre i dati completi (sono i suoi dati).
- Può fare drill-down su singole transazioni.
- Può modificare/categorizzare manualmente se l'anonimizzazione automatica sbaglia categoria.

---

## Marketing positioning

**Claim onesto** (verificabile, difendibile):

> "L'AI di Anlyra analizza i tuoi trend e le tue categorie, non spia i tuoi singoli partner
> commerciali. I nomi di fornitori, clienti e i dettagli sensibili non vengono mai inviati a
> sistemi AI esterni."

**Claim NON utilizzabili** (sarebbero falsi):

- ❌ `"Anlyra non vede mai i tuoi dati"` — il server vede i dati pre-anonimizzazione.
- ❌ `"I tuoi dati restano sul tuo telefono"` — sono in cloud Supabase.
- ❌ `"Zero data sharing"` — Anthropic riceve aggregati.
- ❌ `"Privacy assoluta"` — server ha accesso ai dati; la protezione è architetturale, non assenza
  di accesso.

---

## Legal/GDPR implications

**Anonimizzazione = trattamento ridotto**:

- Dato anonimizzato (categoria + aggregato) → potenzialmente fuori scope Art. 4(1) GDPR per quella
  parte; da valutare formalmente nella DPIA.
- Dato originale (server-side, DB cliente) → in scope Art. 4(1); basi legali applicabili:
  - **Art. 6(1)(b)** — esecuzione del contratto SaaS.
  - **Art. 6(1)(f)** — legittimo interesse (analytics per conto del cliente).

**Sub-processors implicati**:

| Sub-processor | Ruolo | Garanzie richieste |
|---|---|---|
| TrueLayer / Tink / equivalente | PSD2 provider, intermediario bancario | DPA + standard fintech, certificazione AISP |
| Anthropic PBC | AI provider (insight generation) | DPA + opt-out training, riceve solo aggregati |
| Supabase | Storage primario dati cliente | DPA + EU region (Frankfurt), già in lista |

Lista completa in [`docs/gdpr/subprocessor-list.md`](../gdpr/subprocessor-list.md).

**DPIA richiesta (Art. 35)**: **SÌ** — high-risk processing per scala e natura dati finanziari.
Template in [`docs/privacy-dpia-template.md`](../privacy-dpia-template.md). Compilazione formale
pre-launch obbligatoria.

**Trasferimenti internazionali**:

| Destinatario | Tipo dato | Base legale trasferimento |
|---|---|---|
| Anthropic (US) | Aggregati non identificativi | SCC + natura ridotta del dato |
| Vercel (US) | — | EU instance attiva, nessun trasferimento materiale |
| Supabase (EU) | Dati completi | Nessun trasferimento internazionale |

---

## Implementation roadmap

### Pre-launch v1.0

- [ ] Selezione PSD2 provider definitiva — Q3 2026
  (cross-ref: [`docs/integrations/psd2-banking-integration-plan.md`](../integrations/psd2-banking-integration-plan.md))
- [ ] Implementazione pipeline anonimizzazione server-side
- [ ] Definire hash function per controparti (HMAC o SHA-256 con salt per-org — vedi Open questions §sotto)
- [ ] AI prompts library refactor: garantire che gli input contengano solo aggregati
  (cross-ref: [`docs/ai/prompt-library.md`](../ai/prompt-library.md))
- [ ] DPIA formale compilata
  (cross-ref: [`docs/privacy-dpia-template.md`](../privacy-dpia-template.md))
- [ ] Privacy Policy aggiornata con dettaglio architettura
- [ ] CSV fallback flow per banche non PSD2

### Post-launch v1.1+

- [ ] Integrazione QuickBooks / Fatture in Cloud
  (cross-ref: [`docs/integrations/`](../integrations/))
- [ ] User-controlled anonymization granularity (Enterprise option)
- [ ] On-premise deployment option (Enterprise+ post v2.0)

---

## Trade-offs accepted

| Trade-off | Conseguenza accettata |
|---|---|
| Onboarding 1-click PSD2 | Escludiamo segmenti senza banca PSD2 (raro per PMI italiane — banche maggiori coperte) |
| Server vede dati pre-anonimizzazione | Richiede DPA cliente + audit logging accessi interni |
| Anonimizzazione deterministica | AI può perdere granularità su query specifiche; bilanciamento accettato per privacy |
| No app mobile | Nessuna lettura offline/push; accesso solo via web |

---

## Open questions per implementazione

1. **Hash function per controparti**: SHA-256 con salt per-org? O HMAC-SHA256? Il salt dev'essere
   per-org (non globale) per prevenire rainbow table cross-org.

2. **Retention dati grezzi**: per quanto conserviamo i dati originali pre-anonimizzazione?
   Proposta: **24h max**, poi solo versione anonimizzata in DB.

3. **Modalità trasparente (Enterprise opt-in)**: il cliente Enterprise può richiedere che l'AI
   veda dati meno anonimizzati (con DPA aggiuntivo)? Probabilmente NO per coerenza prodotto;
   eventualmente Enterprise+ opt-in con consent esplicito.

4. **Re-identification risk assessment**: valutazione formale che la combinazione di aggregati non
   permetta re-identificazione statistica del singolo (richiesta nella DPIA).

---

## Decision metadata

| Campo | Valore |
|---|---|
| **Decision ID** | DATA-001 |
| **Type** | Architecture + Privacy |
| **Status** | ✅ Decided |
| **Decided on** | 2026-05-27 (sessione cieca giorno 4) |
| **Decided by** | Founder |
| **Stakeholders** | Founder, future DPO, future security consultant |
| **Supersedes** | Assunzione precedente "AI accede a tutto" (mai formalizzata) |
| **Related decisions** | `credit-pack-pricing.md` (pending), pricing tier finals (pending customer interviews) |
| **Re-review** | Post-customer interviews + pre-launch v1.0 |

---

## Cross-references

- [`docs/SECURITY.md`](../SECURITY.md) — security posture generale + GDPR map.
- [`docs/privacy-dpia-template.md`](../privacy-dpia-template.md) — DPIA per nuove feature high-risk.
- [`docs/gdpr/subprocessor-list.md`](../gdpr/subprocessor-list.md) — lista sub-processors aggiornata.
- [`docs/ai/prompt-library.md`](../ai/prompt-library.md) — AI prompts (da aggiornare: input solo aggregati).
- [`docs/integrations/psd2-banking-integration-plan.md`](../integrations/psd2-banking-integration-plan.md) — implementation plan PSD2.
- [`docs/onboarding-flow.md`](../onboarding-flow.md) — flow "Collega banca" nel wizard onboarding.

---

**Status**: ✅ Decided · Living document, aggiornato all'avanzare dell'implementazione.
**Last updated**: 2026-05-27.
