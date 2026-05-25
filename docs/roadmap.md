---
title: Anlyra · Roadmap pubblica
version: 1.0
last_updated: 2026-05-25
status: living document
audience: clienti, prospect, partner
---

# Roadmap Anlyra

> Cosa stiamo costruendo nei prossimi 12 mesi.
>
> Aggiorniamo questa pagina regolarmente. Niente promesse vaporware: scriviamo qui solo cose che abbiamo confidence di consegnare.

**Ultima revisione**: maggio 2026

## Legenda

- ✅ **Shipped**: già disponibile
- 🚧 **In progress**: stiamo lavorando ora
- ⏭️ **Next**: prossimo trimestre
- 💭 **Considering**: ci stiamo pensando, no commitment

---

## Q2 2026 (in corso) — Foundation

### ✅ Shipped

- Design system custom (palette panna+sage, 14 componenti restyled)
- Dashboard funzionante: Overview, Finance, AI Insights, AI Alerts, Operations, Market, Settings
- Sito pubblico completo (landing, pricing 3-tier, legal pages)
- i18n IT/EN (1556+ chiavi tradotte)
- Auth demo + login flow base
- AI insights generation tramite Anthropic Claude
- KPI dashboard con sparkline e delta indicators
- Email transactional infrastructure (Resend + 5 template italiani)
- SEO foundation (robots.txt, sitemap.xml, Schema.org JSON-LD, OG metadata)
- Import dati CSV con wizard di mapping guidato

### 🚧 In progress

- Auth reale: signup + email verify + Google/Microsoft OAuth (NextAuth v5)
- 2FA TOTP (autenticazione a due fattori)
- Stripe production setup (price IDs, Tax, webhook configurati)
- Migration SQLite → Supabase Postgres (EU region, Frankfurt)
- Deploy production Vercel + DNS anlyra.it

---

## Q3 2026 — Commercial launch

### 🚧 Pre-launch

- Test E2E suite (Playwright — copertura flussi critici: signup, checkout, import)
- Sentry integration (error tracking + performance monitoring)
- Status page (status.anlyra.it)
- SOC 2 Type 1 audit kickoff (con Vanta o Drata)

### ⏭️ Launch features

- **QuickBooks integration** — import dati contabili automatico, sincronizzazione ricorrente
- **Xero integration** — alternativa QuickBooks per il mercato italiano e internazionale
- **Fatture in Cloud integration** — il gestionale più diffuso tra le PMI italiane
- **Multi-org per utente** — gestire più organizzazioni con lo stesso account (per agenzie e consulenti)
- **Custom dashboard builder migliorato** — drag-and-drop con 14 widget, layout persistente server-side

### 💭 Considering

- Notifiche Slack per alert AI critici
- Mobile app iOS/Android (read-only — consultazione dashboard da smartphone)
- API REST pubblica per integrazione con sistemi custom (piani Avanzato+)

---

## Q4 2026 — Expansion

### ⏭️ Planned

- **PSD2 banking integration** — connessione diretta al conto corrente aziendale via TrueLayer/Tink per import automatico movimenti bancari
- **Forecasting AI avanzato** — proiezione cash flow a 12 mesi con scenari (ottimistico, base, pessimistico)
- **Benchmark settore live** — confronto real-time delle metriche chiave vs PMI italiane dello stesso settore e dimensione
- **Audit log + export** — tracciamento accessi e operazioni per compliance enterprise (chi ha fatto cosa, quando)
- **Team collaboration** — commenti su dashboard, @mention utenti, notifiche in-app

### 💭 Considering

- White-label per consulenti e commercialisti (dashboard brandizzata con logo del consulente)
- Marketplace di template dashboard per settore (retail, SaaS, manifattura, servizi professionali)
- Integrazione con software gestionali italiani (Zucchetti, TeamSystem)

---

## Q1 2027 — Maturity

### ⏭️ Planned

- **Multi-currency** — supporto USD, GBP, CHF, JPY per PMI con attività di export o sedi estere
- **Multi-entity consolidation** — per gruppi PMI con più società: vista consolidata + drill-down per entità
- **Custom AI prompts** (Enterprise) — configura cosa il motore AI deve prioritizzare nell'analisi per il tuo settore
- **SSO SAML** — integrazione con Okta, Azure AD, Auth0 per aziende con identity provider centralizzato

### 💭 Considering

- ISO 27001 certification kickoff
- Bug bounty pubblico
- Data warehouse export (Snowflake, BigQuery) per clienti con team data interno

---

## Q2 2027 — Scale

### ⏭️ Planned

- **Anlyra Insights Newsletter** — digest settimanale automatico via email con i KPI più importanti e gli insight AI della settimana
- **Public sharing** — link pubblico read-only per singole dashboard o report, con scadenza configurabile
- **Webhook outbound** — Anlyra notifica sistemi esterni (Slack, Discord, Zapier, webhook custom) su eventi specifici (alert attivato, soglia superata, report generato)

### 💭 Considering

- Anlyra Mobile full-feature (oltre la sola lettura)
- Multilanguage UI oltre IT/EN (DE, FR, ES per mercati UE)
- Self-hosted Enterprise option (per banche, healthcare, settori ultra-regolamentati)

---

## Cosa NON è nella roadmap

Per onestà, ecco cose che **non faremo** anche se ce le chiedete:

❌ **Anlyra come servizio consumer (B2C).** Restiamo focused su PMI e team aziendali.

❌ **AI generativa per creazione contenuti** (post social, email marketing, copywriting). Non è il nostro dominio.

❌ **CRM completo** (sostituire HubSpot o Salesforce). Anlyra è analytics, non gestione del ciclo di vendita.

❌ **Sistemi per accettare pagamenti** (alternative a Stripe per i clienti dei nostri clienti). Out of scope.

❌ **Consigli finanziari o di investimento.** Anlyra mostra dati e analisi; le decisioni restano al team.

---

## Come influenzare la roadmap

Le priorità vengono da:

1. **Feedback clienti diretti** — interviste, support tickets, churn survey
2. **Dati di utilizzo** — cosa usano davvero le persone, dove si bloccano
3. **Vision prodotto** — cosa rende Anlyra unico per PMI italiane

Se sei cliente o prospect e vuoi contribuire:

- **Feature request**: scrivi a [feedback@anlyra.it](mailto:feedback@anlyra.it)
- **Customer council** (piano Enterprise): meeting trimestrali con il team prodotto
- **Beta testing**: iscriviti alle beta features in `/settings/labs` (in arrivo)

---

## FAQ roadmap

### Le date sono garantite?

No. La roadmap è **direzionale, non vincolante**. Il software è complesso, le priorità cambiano. Comunichiamo proattivamente quando qualcosa si sposta o viene rimosso.

### Posso vedere cosa state lavorando adesso?

Sì, parzialmente. Il public changelog sarà disponibile su `/changelog` (in costruzione). Per aggiornamenti più frequenti: seguici su LinkedIn (linkedin.com/company/anlyra — in attivazione).

### Le feature Enterprise quando arrivano?

SSO SAML è pianificato per Q1 2027. Audit log per Q4 2026. Per esigenze enterprise urgenti: [contattaci](mailto:hello@anlyra.it), valutiamo case-by-case.

### Cosa succede se cancellate una feature dalla roadmap?

Cancellazione = decisione strategica consapevole. Comunichiamo apertamente nel changelog con la motivazione (es. "il 90% dei clienti chiedeva altro", "abbiamo trovato un approccio migliore"). Niente cancellazioni silenziose.

### Posso richiedere una feature non in lista?

Sì. Scrivi a [feedback@anlyra.it](mailto:feedback@anlyra.it) con il contesto: che problema stai cercando di risolvere, quante persone nel tuo team ne beneficerebbero, con quale frequenza. Il contesto ci aiuta molto più del solo nome della feature.

---

**Status**: living document, aggiornato ogni trimestre.  
**Ultima revisione**: maggio 2026  
**Prossima revisione**: agosto 2026
