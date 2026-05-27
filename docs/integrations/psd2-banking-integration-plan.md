---
title: Anlyra · PSD2 Banking Integration Plan
audience: developer (futuro Q4 2026)
status: pianificato · non implementato
last_updated: 2026-05-27
---

# PSD2 Banking Integration Plan

> Piano tecnico per collegare i conti bancari tramite Open Banking (PSD2). Consente import
> automatico di estratti conto e transazioni. **Pianificato Q4 2026**, non implementato.

**Documenti correlati**: [`quickbooks-integration-plan.md`](quickbooks-integration-plan.md),
[`../security-audit-checklist.md`](../security-audit-checklist.md) (§3, §5),
[`../gdpr/`](../gdpr/).

---

## 1. PSD2 overview

- **Direttiva EU**: Payment Services Directive 2 (2015/2366), recepita in Italia con D.Lgs 218/2017.
- **Permette**: accesso a conti bancari via API con consenso esplicito del titolare (AISP — Account
  Information Service Provider).
- **Non richiede**: licenza bancaria per funzionalità read-only (AISP), ma richiede registrazione
  come AISP o accordo con un AISP autorizzato.
- **Approccio Anlyra**: integrazione tramite provider aggregator (non direttamente banche) per
  ridurre complessità normativa.

---

## 2. Provider comparison

| Provider | Copertura IT | Costi | Note |
|---|---|---|---|
| **TrueLayer** | Buona (principali banche) | Pay-per-call o flat | Documentazione eccellente, sandbox |
| **Tink** (Visa) | Ottima (60+ banche IT) | Enterprise pricing | Acquisito da Visa, robusto |
| **GoCardless Open Banking** | Buona | Pay-per-call | Forte nel UK, crescita EU |
| **Nordigen** (GoCardless) | Buona | Free tier disponibile | Merge in GoCardless |

**Raccomandazione**: iniziare con **TrueLayer** (sandbox disponibile, documentazione IT) o
**Tink** (migliore copertura banche italiane). Valutare in fase di implementazione.

---

## 3. Consent flow utente

1. Utente clicca "Collega conto bancario" in Anlyra.
2. Anlyra reindirizza a provider (TrueLayer/Tink) con `redirect_uri` + `state` CSRF token.
3. Provider mostra lista banche disponibili; utente sceglie la propria banca.
4. Redirect alla banca per autenticazione (Strong Customer Authentication — SCA).
5. Redirect a Anlyra callback con `code` di autorizzazione.
6. Anlyra scambia `code` per `access_token` + `refresh_token`.
7. Token salvati cifrati in `IntegrationConnection`.
8. Consenso PSD2 valido tipicamente 90 giorni; re-autenticazione richiesta alla scadenza.

---

## 4. Data sync

### Transazioni
- Endpoint: `GET /data/v1/accounts/{account_id}/transactions`
- Storico: fino a 2 anni (variabile per banca).
- Campi: `timestamp`, `amount`, `currency`, `description`, `merchant_name`, `category`.
- Mapping: `FinancialRecord` con `source = 'psd2'` e `category` come metadato.

### Saldi
- Endpoint: `GET /data/v1/accounts/{account_id}/balance`
- Frequenza sync: giornaliera (per KPI "Cash balance").
- Storage: `CashBalance` model (da aggiungere) con timestamp.

### Conti
- Endpoint: `GET /data/v1/accounts`
- Al setup: lista conti, utente seleziona quali collegare.

### Frequenza sync
- Transazioni: ogni 6 ore.
- Saldo: ogni ora (per runaway calculation aggiornata).
- Re-autenticazione: alert 7 giorni prima scadenza consenso.

---

## 5. Security considerations

- Tutti i token PSD2 cifrati con AES-256 in DB.
- Redirect URI HTTPS-only, lista whitelist.
- State parameter CSRF su ogni richiesta OAuth.
- Webhook del provider verificati via HMAC signature.
- Dati bancari: accesso limitato a utenti con ruolo `admin` nell'org.
- Audit log: ogni accesso a dati bancari loggato.
- PSD2 data non condivisi con Anthropic (data minimization, vedi `../ai/prompt-library.md`).

---

## 6. Copertura banche italiane (stima Q4 2026)

| Banca | TrueLayer | Tink |
|---|---|---|
| Intesa Sanpaolo | ✓ | ✓ |
| UniCredit | ✓ | ✓ |
| BNL | ✓ | ✓ |
| Banco BPM | ✓ | ✓ |
| MPS | Parziale | ✓ |
| Fineco | ✓ | ✓ |
| Revolut IT | ✓ | ✓ |
| N26 | ✓ | ✓ |

---

**Status**: pianificato Q4 2026 · non implementato.  
**Pre-requisiti**: scelta provider, registrazione account, aggiornamento Privacy Policy e consenso
PSD2 esplicito in onboarding.  
**Last updated**: 2026-05-27.
