---
title: Anlyra · QuickBooks Integration Plan
audience: developer (futuro Q3 2026)
status: pianificato · non implementato
last_updated: 2026-05-27
---

# QuickBooks Integration Plan

> Piano tecnico per l'integrazione con QuickBooks Online tramite Intuit Developer API. La feature è
> **pianificata per Q3 2026**, non ancora implementata.

**Documenti correlati**: [`fatture-in-cloud-integration-plan.md`](fatture-in-cloud-integration-plan.md),
[`psd2-banking-integration-plan.md`](psd2-banking-integration-plan.md),
[`../dev/coding-standards.md`](../dev/coding-standards.md),
[`../security-audit-checklist.md`](../security-audit-checklist.md) (§4 API).

---

## 1. OAuth flow — Intuit Developer

- **Provider**: Intuit Developer Platform (developer.intuit.com).
- **OAuth 2.0**: Authorization Code flow con PKCE.
- **Scopes richiesti**: `com.intuit.quickbooks.accounting` (read + write limitato).
- **Redirect URI**: `https://anlyra.it/api/integrations/quickbooks/callback`.
- **Token storage**: refresh token cifrato in DB (`IntegrationConnection` model da aggiungere a schema).
- **Token refresh**: automatico con 30 minuti di anticipo sulla scadenza.
- **Company ID**: `realmId` Intuit, salvato per-org in `IntegrationConnection.externalId`.

---

## 2. API endpoints rilevanti

| Endpoint | Metodo | Uso |
|---|---|---|
| `/v3/company/{realmId}/query` | GET | Query SQL-like per tutti gli entity type |
| `/v3/company/{realmId}/invoice` | GET/POST | Fatture clienti |
| `/v3/company/{realmId}/bill` | GET | Fatture fornitori |
| `/v3/company/{realmId}/customer` | GET | Anagrafica clienti |
| `/v3/company/{realmId}/vendor` | GET | Anagrafica fornitori |
| `/v3/company/{realmId}/item` | GET | Prodotti/servizi |
| `/v3/company/{realmId}/account` | GET | Piano dei conti |
| `/v3/company/{realmId}/payment` | GET | Pagamenti ricevuti |

**Base URL**: `https://quickbooks.api.intuit.com`  
**Versione API**: v3 (corrente).

---

## 3. Data mapping Anlyra ↔ QuickBooks

| QuickBooks | Anlyra | Note |
|---|---|---|
| `Invoice.TotalAmt` | `FinancialRecord.amount` | Fattura cliente |
| `Invoice.TxnDate` | `FinancialRecord.date` | Data emissione |
| `Invoice.CustomerRef` | `FinancialRecord.counterparty` | Nome cliente |
| `Bill.TotalAmt` | `FinancialRecord.amount` (negativo) | Fattura fornitore |
| `Payment.TotalAmt` | `FinancialRecord.amount` | Pagamento ricevuto |
| `Account.AccountType` | categoria KPI | Mapping piano dei conti |

---

## 4. Sync strategy

### Initial sync
1. Fetch tutti i record degli ultimi 24 mesi (paginazione con `startPosition`).
2. Trasforma e inserisce in `FinancialRecord` con `source = 'quickbooks'`.
3. Marca timestamp `lastSyncAt` nella `IntegrationConnection`.

### Incremental sync
- Schedulato ogni 6 ore via cron.
- Query con `MetaData.LastUpdatedTime > lastSyncAt`.
- Upsert su `(externalId, source)` per idempotenza.

### Webhook (futuro)
- Intuit webhooks per notify real-time su create/update/delete.
- Verifica firma HMAC-SHA256 dell'header `intuit-signature`.

---

## 5. Error handling

| Errore | Azione |
|---|---|
| 401 Unauthorized | Refresh token; se fallisce → disconnect + notifica utente |
| 429 Rate limit | Exponential backoff (2s, 4s, 8s, 16s) |
| 400 Bad request | Log + skip record; continua sync |
| 503 Service unavailable | Retry dopo 30 min, max 3 volte |

---

## 6. Multi-currency

- QuickBooks supporta valute multiple; Anlyra mostra valuta base dell'org.
- `Invoice.ExchangeRate` + `Invoice.CurrencyRef` usati per conversione.
- Conversione al tasso del giorno della transazione.

---

## 7. Italian VAT specifics

- Italy QuickBooks: `TaxCode` mapping a codici IVA italiani (22%, 10%, 4%, esente).
- `TaxAmt` estratto separatamente per reporting IVA.
- SDI/e-fattura: QuickBooks IT supporta il flusso, ma la gestione e-fattura rimane in-platform.

---

**Status**: pianificato Q3 2026 · non implementato.  
**Pre-requisiti**: schema migration `IntegrationConnection`, OAuth infrastruttura.  
**Last updated**: 2026-05-27.
