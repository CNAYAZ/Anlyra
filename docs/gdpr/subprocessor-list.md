---
title: Anlyra · Subprocessor List
audience: customers, DPO, legal
last_updated: 2026-05-26
status: living document
---

# Subprocessor List

> Lista dei sub-responsabili del trattamento (sub-processor) che Anlyra coinvolge nel trattamento dei dati personali dei propri clienti.

**Aggiornamento**: questa lista viene aggiornata prima di ogni aggiunta di nuovo sub-processor. I clienti Enterprise ricevono notifica via email con 30 giorni di anticipo per eventuali modifiche materiali.

**Base giuridica per i trasferimenti extra-UE**: Standard Contractual Clauses (SCC) adottate dalla Commissione Europea (decisione 2021/914), dove applicabile.

**Correlati**: `docs/legal/privacy-policy.md`, [`privacy-dpia-template.md`](../privacy-dpia-template.md), [`cookie-consent-ux.md`](cookie-consent-ux.md).

---

## Sub-processor attivi

### 1. Supabase Inc.
| Campo | Dettaglio |
|-------|-----------|
| **Nome legale** | Supabase Inc. |
| **Sede** | San Francisco, CA, USA |
| **Servizio fornito** | Database relazionale (PostgreSQL), autenticazione, storage |
| **Dati trattati** | Tutti i dati degli utenti Anlyra: account, organizzazioni, dati aziendali importati, insight generati |
| **Region di storage** | EU-West (Frankfurt, Germania) — configurato esplicitamente |
| **Trasferimento extra-UE** | No (storage EU) — società USA ma dati in EU |
| **DPA firmato** | Sì — DPA disponibile su supabase.com/legal |
| **Sub-processor notabili** | AWS Frankfurt (infra hosting) |

---

### 2. Vercel Inc.
| Campo | Dettaglio |
|-------|-----------|
| **Nome legale** | Vercel Inc. |
| **Sede** | San Francisco, CA, USA |
| **Servizio fornito** | Hosting applicazione web (frontend + API route), CDN, deployment |
| **Dati trattati** | Log di accesso (IP, user-agent, timestamp), cookie di sessione in transito |
| **Region di storage** | Edge network globale; funzioni serverless in EU-West |
| **Trasferimento extra-UE** | Sì (CDN globale) — SCC in vigore |
| **DPA firmato** | Sì — vercel.com/legal/dpa |
| **Sub-processor notabili** | AWS (infra hosting funzioni) |

---

### 3. Stripe Inc.
| Campo | Dettaglio |
|-------|-----------|
| **Nome legale** | Stripe Payments Europe, Limited (per clienti EU) |
| **Sede** | Dublin, Irlanda (entità EU) |
| **Servizio fornito** | Elaborazione pagamenti, gestione abbonamenti, portale fatturazione |
| **Dati trattati** | Dati di pagamento (carte, IBAN), dati di fatturazione (nome, indirizzo, email), storico transazioni |
| **Region di storage** | EU (Irlanda) per clienti europei |
| **Trasferimento extra-UE** | Limitato (frode detection con infra USA) — SCC in vigore |
| **DPA firmato** | Sì — stripe.com/legal/dpa |
| **Sub-processor notabili** | AWS, Google Cloud (infra Stripe) |

---

### 4. Resend Inc.
| Campo | Dettaglio |
|-------|-----------|
| **Nome legale** | Resend Inc. |
| **Sede** | San Francisco, CA, USA |
| **Servizio fornito** | Invio email transazionali (welcome, verify, reset password, fatture, alert) |
| **Dati trattati** | Indirizzo email destinatario, nome, contenuto email transazionale |
| **Region di storage** | USA (con possibilità EU — configurare nella dashboard Resend) |
| **Trasferimento extra-UE** | Sì — SCC in vigore |
| **DPA firmato** | Sì — resend.com/legal/dpa |
| **Sub-processor notabili** | AWS SES (infra SMTP) |

---

### 5. Anthropic, PBC
| Campo | Dettaglio |
|-------|-----------|
| **Nome legale** | Anthropic, PBC |
| **Sede** | San Francisco, CA, USA |
| **Servizio fornito** | Generazione AI: insight, alert, forecast, analisi automatica dei dati |
| **Dati trattati** | Dati aziendali aggregati forniti dall'utente (metriche, KPI, serie storiche); potenziale presenza incidentale di PII in campi liberi |
| **Region di storage** | USA |
| **Trasferimento extra-UE** | Sì — SCC in vigore; Anthropic non usa i dati per training (clausola contrattuale esplicita) |
| **DPA firmato** | Sì — anthropic.com/legal/privacy (DPA su richiesta per Enterprise) |
| **Sub-processor notabili** | AWS (infra Anthropic) |
| **Mitigazione rischio** | Minimizzazione: invio dati aggregati dove possibile; pseudonimizzazione PII prima dell'invio. Vedi DPIA in [`privacy-dpia-template.md`](../privacy-dpia-template.md) |

---

### 6. Sentry (pianificato)
| Campo | Dettaglio |
|-------|-----------|
| **Nome legale** | Functional Software, Inc. (Sentry) |
| **Sede** | San Francisco, CA, USA |
| **Servizio fornito** | Error monitoring, performance monitoring dell'applicazione |
| **Dati trattati** | Stack trace degli errori (possibile presenza di PII se inclusa nei payload); user ID anonimizzato |
| **Region di storage** | USA (piano cloud) — possibile EU se self-hosted o piano Enterprise |
| **Trasferimento extra-UE** | Sì — SCC in vigore |
| **DPA firmato** | Sì — sentry.io/legal/dpa |
| **Status** | Pianificato — attivare con configurazione PII scrubbing prima del lancio |
| **Mitigazione** | Configurare PII scrubbing automatico (before-send hook) per rimuovere dati personali dagli eventi inviati |

---

## Sub-processor rimossi

*(Nessuno al momento)*

---

## Notifica modifiche

Anlyra si impegna a:
- Notificare i clienti Enterprise con **30 giorni di anticipo** prima di aggiungere o sostituire un sub-processor materiale.
- Aggiornare questa pagina contestualmente ad ogni modifica.
- Mantenere lo storico delle modifiche in questo documento.

I clienti che non accettano la modifica hanno il diritto di risolvere il contratto secondo i termini del proprio piano, senza penali, entro il periodo di notifica.

---

**Status**: living document. Aggiornare ad ogni aggiunta o rimozione di un sub-processor prima dell'attivazione del servizio.
