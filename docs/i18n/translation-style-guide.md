---
title: Anlyra · Translation Style Guide
audience: traduttori, content writer, developer (next-intl strings)
status: operativo
last_updated: 2026-05-27
---

# Translation Style Guide — IT / EN

> Guida per la traduzione e la localizzazione dei testi di Anlyra. Si applica a tutti i testi UI,
> email, documentazione pubblica e comunicazioni marketing.

**Documenti correlati**: [`../brand-guidelines.md`](../brand-guidelines.md),
[`../marketing/landing-variants.md`](../marketing/landing-variants.md),
[`../email/onboarding-sequence.md`](../email/onboarding-sequence.md).

---

## 1. Tono di voce — Italiano

- **Registro**: professionale ma caldo. Non formale-burocratico, non colloquiale-slangy.
- **"Tu" vs "Lei"**: Anlyra usa **"tu"** per default — friendly, diretto, rispettoso. NON "Lei".
  - ✅ "Carica i tuoi dati" / ❌ "Carichi i Suoi dati"
- **Anglicism**: usare solo se il termine italiano è poco usato o goffo.
  - ✅ "dashboard" (accettato, noto) / ❌ "cruscotto" (formale, non usato nel settore)
  - ✅ "insight" (accettato) / ❌ "intuizione" (semantica diversa)
  - ✅ "SaaS" / ❌ "Software come Servizio" (nessuno lo usa così)
- **Emoji**: vietate nella UI di prodotto e nelle email transazionali. OK nei social.
- **Virgolette**: usare le virgolette italiane (`«»`) nel testo editoriale; `""` nel codice/UI.

---

## 2. Tono di voce — Inglese

- **Register**: professional, warm, direct. British-friendly but not exclusively.
- **Formality**: informal "you", no "please" excess, no corporate jargon.
- **Oxford comma**: yes.
- **Capitalization**: sentence case for UI strings, headline case for headings only.
  - ✅ "Start your free trial" / ❌ "Start Your Free Trial" (headline case in body)
- **Contractions**: allowed where natural ("you're", "it's", "don't").

---

## 3. Politica anglicismi — lista completa

| Termine IT ufficiale | Termine EN | Note |
|---|---|---|
| dashboard | dashboard | Invariato |
| insight (AI) | insight | Invariato |
| report | report | Invariato |
| piano (abbonamento) | plan | |
| organizzazione | organization | Non "company" né "account" |
| utente | user | |
| membro del team | team member | |
| prova gratuita | free trial | |
| credito | credit | |
| fattura | invoice (emessa) / bill (ricevuta) | |
| fornitore | supplier / vendor | |
| cliente | customer / client | Preferire "customer" per B2B |
| flusso di cassa | cash flow | |
| margine | margin | |
| obiettivo | goal / objective | OKR: objective |
| risultato chiave | key result | |
| previsione | forecast | Non "projection" in IT |
| avviso | alert | Non "warning" per notifiche positive |
| impostazioni | settings | Non "preferenze" |
| accesso | login / sign in | Login per sostantivo, sign in per azione |
| registrazione | sign up | Non "register" nella UI |
| disconnetti | sign out | Non "log out" (anche se equivalente) |
| verifica email | verify email | |
| password dimenticata | forgot password | |
| codice di backup | backup code | |

---

## 4. Linguaggio gender-neutral

- Italiano: preferire forme neutre o costruzioni che evitano il genere dove possibile.
  - ✅ "Benvenuto/a in Anlyra" (o "Benvenuto in Anlyra" come default neutro) ← scegliere uno standard e applicarlo
  - ✅ "Il team" / ❌ "i dipendenti"/"le dipendenti" separati
  - Dove il genere è necessario (form, documenti), includere opzione "Preferisco non specificare".
- Inglese: già gender-neutral per default; usare "they/them" per terza persona singola sconosciuta.

---

## 5. Numeri, date, valute

| Formato | IT | EN |
|---|---|---|
| Data | 27/05/2026 o 27 maggio 2026 | May 27, 2026 |
| Ora | 14:30 | 2:30 PM |
| Valuta | €1.234,56 | €1,234.56 |
| Percentuale | 12% | 12% |
| Grandi numeri | 1.000 (punto separatore migliaia) | 1,000 (comma) |
| Decimali | 1,5 (virgola) | 1.5 (punto) |

---

## 6. Processo di traduzione

1. **Stringa IT**: il testo italiano è la source of truth.
2. **Traduzione EN**: tradurre rispettando il tono (non word-by-word, ma semanticamente fedele).
3. **Review**: almeno 1 native speaker review per testi pubblici.
4. **Aggiornamento**: quando la stringa IT cambia, la EN va aggiornata entro 48h.
5. **File**: stringhe in `messages/it.json` e `messages/en.json` (gestite da `next-intl`).

---

## 7. Termini da non tradurre

Termini tecnici/brand che rimangono invariati in entrambe le lingue:
`Anlyra` · `Pro` · `Avanzato/Advanced` · `Enterprise` · `TOTP` · `OAuth` · `SaaS` · `API` ·
`CSV` · `JSON` · `GDPR` · `SDI` (Italia only) · `IVA` / `VAT`

---

**Status**: operativo.  
**Last updated**: 2026-05-27.
