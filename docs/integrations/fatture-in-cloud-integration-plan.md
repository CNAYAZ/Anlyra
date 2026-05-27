---
title: Anlyra · Fatture in Cloud Integration Plan
audience: developer (futuro Q3 2026)
status: pianificato · non implementato
last_updated: 2026-05-27
---

# Fatture in Cloud Integration Plan

> Piano tecnico per l'integrazione con Fatture in Cloud (Teamsystem), il principale software di
> fatturazione elettronica italiano. **Pianificato Q3 2026**, non ancora implementato.

**Documenti correlati**: [`quickbooks-integration-plan.md`](quickbooks-integration-plan.md),
[`psd2-banking-integration-plan.md`](psd2-banking-integration-plan.md),
[`../security-audit-checklist.md`](../security-audit-checklist.md) (§4).

---

## 1. API Authentication

- **OAuth 2.0**: Authorization Code grant, Teamsystem Developer Portal.
- **Base URL**: `https://api-v2.fattureincloud.it`
- **Scope**: `issued_documents:r`, `received_documents:r`, `clients:r`, `suppliers:r`,
  `products:r`, `settings:r`.
- **Token storage**: refresh token cifrato in DB, per-org.
- **Token TTL**: access token 1h; refresh token 30 giorni (rinnovato automaticamente).

---

## 2. Endpoints rilevanti

| Endpoint | Metodo | Entità |
|---|---|---|
| `/v2/c/{company_id}/issued_documents` | GET | Fatture emesse (clienti) |
| `/v2/c/{company_id}/received_documents` | GET | Fatture ricevute (fornitori) |
| `/v2/c/{company_id}/clients` | GET | Anagrafica clienti |
| `/v2/c/{company_id}/suppliers` | GET | Anagrafica fornitori |
| `/v2/c/{company_id}/products` | GET | Prodotti/servizi |
| `/v2/c/{company_id}/settings/payment_accounts` | GET | Conti di pagamento |

---

## 3. SDI Codice Univoco support

- `issued_documents[].e_invoice_id`: identificativo SDI della fattura elettronica.
- `issued_documents[].e_invoice_status`: stato consegna SDI (delivered, rejected, ecc.).
- Mapping: lo stato SDI viene salvato come metadato aggiuntivo su `FinancialRecord.metadata` (JSONB).

---

## 4. Data mapping Anlyra ↔ Fatture in Cloud

| FiC | Anlyra | Note |
|---|---|---|
| `issued_documents[].net_amount` | `FinancialRecord.amount` | Imponibile |
| `issued_documents[].gross_amount` | metadato | Lordo (IVA inclusa) |
| `issued_documents[].date` | `FinancialRecord.date` | Data emissione |
| `issued_documents[].type` | categoria | invoice / credit_note / proforma |
| `issued_documents[].client.name` | `FinancialRecord.counterparty` | Cliente |
| `received_documents[].net_amount` | `FinancialRecord.amount` (negativo) | Spesa fornitore |
| `issued_documents[].payment_terms` | metadato | Scadenza pagamento (per DSO) |

---

## 5. Sync schedule

- **Initial sync**: ultimi 24 mesi, paginazione (`page`, `per_page: 100`).
- **Incremental**: ogni 4 ore, filtro `?updated_after={lastSyncAt}`.
- **Upsert**: su `(externalId, source='fatture_in_cloud')` per idempotenza.
- **Webhook FiC**: disponibili su piano Enterprise FiC; da valutare per notifiche real-time.

---

## 6. IVA e compliance italiana

- `issued_documents[].vat_type`: codice IVA (22%, 10%, 4%, esente, fuori campo).
- `issued_documents[].vat_amount`: importo IVA da estrarre per report liquidazione IVA.
- Ritenuta d'acconto: `issued_documents[].withholding_tax` — estratto separatamente.
- Regime forfettario: rilevato da `settings.info.regime`; KPI adattati.

---

**Status**: pianificato Q3 2026 · non implementato.  
**Pre-requisiti**: schema `IntegrationConnection`, Teamsystem Developer Portal account.  
**Last updated**: 2026-05-27.
