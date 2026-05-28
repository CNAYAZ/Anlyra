# Anlyra

> **Privacy seria, sul serio.** Piattaforma B2B SaaS di analytics + AI advisory per PMI italiane.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%E2%89%A522-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](#license)
[![Status](https://img.shields.io/badge/status-pre--launch-yellow.svg)](https://anlyra.it)

---

## Cosa è Anlyra

Anlyra è una piattaforma B2B SaaS che unisce **gestione dati di business** e **AI advisory** in
un unico prodotto pensato per le PMI italiane. L'utente carica (o integra) i propri dati
finanziari, di marketing e operativi; Anlyra li normalizza, calcola KPI e — tramite Anthropic
Claude — genera **insight**, **alert** e **forecast** comprensibili, sempre con i dati sottostanti
in chiaro e un confidence score.

**Target**: imprenditori e management di PMI italiane, commercialisti, marketer e agency che
vogliono analytics di livello enterprise senza la complessità e i costi di SAP/Oracle.

**Positioning**: Anlyra è un **supporter economico, non un sostituto**. L'AI è uno strumento di
supporto alla decisione: non prende decisioni al posto dell'imprenditore, non sostituisce il
commercialista. Mostra sempre i numeri, le fonti e il grado di confidenza.

**Caratteri distintivi**:

- **Italiano-first, made in Italy** — UI, copy, documenti e supporto in italiano (EN secondario).
- **Multi-org** — un utente può appartenere a più organizzazioni (modello `Membership`).
- **Privacy by design** — dati su server EU, nessun training AI sui dati cliente, nessuna vendita dati.
- **Premium ma accessibile** — pricing pensato per la PMI italiana, non per l'enterprise USA.
- **AI trasparente** — confidence score, dati sottostanti sempre visibili, niente "scatola nera".

[Sito pubblico](https://anlyra.it) · [Pricing](https://anlyra.it/it/pricing) · [Privacy](https://anlyra.it/it/legal/privacy)

---

## Stack tecnico

Versioni allineate a `package.json` (development phase).

| Layer | Tecnologia | Versione / Note |
|---|---|---|
| Framework | Next.js (App Router, Server Components) | `14.2.18` |
| Linguaggio | TypeScript (strict) | `5.6.3` |
| Runtime | Node.js | `≥ 22` |
| Styling | Tailwind CSS | `3.x` + design system custom |
| UI components | shadcn/ui + Radix UI primitives | — |
| Form & validazione | React Hook Form + Zod | `@hookform/resolvers` |
| ORM | Prisma | `5.22` |
| DB (dev) | SQLite | file locale |
| DB (prod) | Supabase Postgres | EU region (Frankfurt) |
| Auth | NextAuth v5 (Auth.js) | `5.0.0-beta` + `@auth/prisma-adapter` |
| 2FA | TOTP (speakeasy + qrcode) | backup code monouso |
| AI | Anthropic Claude (`@anthropic-ai/sdk`) | `0.32` — insight / alert / forecast |
| Email | Resend | `4.x` — transazionali |
| Pagamenti | Stripe | `17.x` — subscription + credit pack |
| i18n | next-intl | `3.25` — IT primaria, EN secondaria |
| Hosting | Vercel | target produzione |
| Error tracking | Sentry | pianificato |
| Rate limiting | Upstash Redis | pianificato |
| Analytics prodotto | PostHog vs Mixpanel | da valutare |

---

## Stato del progetto

**Status**: pre-launch (development phase).

Pronto (✅):

- ✅ Sito pubblico (landing, pricing 3-tier, pagine legali, login/signup).
- ✅ Dashboard funzionante (overview, finance, AI insight/alert, operations, market, settings).
- ✅ Design system custom v2 (5/5 fasi — palette panna+sage, componenti restilizzati).
- ✅ i18n IT/EN allineato (next-intl).
- ✅ AI insight generation operativa (Anthropic Claude).
- ✅ **FASE D Auth** — NextAuth v5 + signup reale + email verify obbligatoria + 2FA TOTP +
  onboarding wizard + multi-org via `Membership` + invite flow.
- ✅ Email transazionali (Resend + template italiani).
- ✅ Stripe webhook integration base.
- ✅ SEO foundation (robots, sitemap, Schema.org JSON-LD, OG metadata).

Mancante pre-launch commerciale (🚧):

- 🚧 Verifica runtime FASE D end-to-end (vedi [`docs/codespace-recovery-procedure.md`](docs/codespace-recovery-procedure.md)).
- 🚧 Migration SQLite → Supabase Postgres ([`docs/postgres-migration-plan.md`](docs/postgres-migration-plan.md)).
- 🚧 Stripe production (price IDs, Tax) — [`docs/stripe-setup.md`](docs/stripe-setup.md).
- 🚧 Deploy Vercel + DNS production — [`docs/DEPLOY.md`](docs/DEPLOY.md).
- 🚧 Security audit 51 item — [`docs/security-audit-checklist.md`](docs/security-audit-checklist.md).
- 🚧 Sentry integration + rate limiting (Upstash).
- 🚧 Test E2E suite (Playwright) — [`docs/TESTING.md`](docs/TESTING.md).

Roadmap dettagliata: [`docs/roadmap.md`](docs/roadmap.md).

---

## Documentazione

Tutta la documentazione di progetto vive in [`docs/`](docs/) (~50 documenti). Indice ragionato:

### Setup & Deploy
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — Guida deploy production (Vercel + Supabase + DNS + Stripe + Resend).
- [`docs/dev/local-development-setup.md`](docs/dev/local-development-setup.md) — Setup ambiente locale.
- [`docs/postgres-migration-plan.md`](docs/postgres-migration-plan.md) — Migration SQLite → Postgres.
- [`docs/stripe-setup.md`](docs/stripe-setup.md) — Stripe production setup.
- [`docs/codespace-recovery-procedure.md`](docs/codespace-recovery-procedure.md) — Recovery post-sessione cieca.

### Security & Compliance
- [`docs/SECURITY.md`](docs/SECURITY.md) — Security posture + GDPR map + enterprise FAQ.
- [`docs/security-audit-checklist.md`](docs/security-audit-checklist.md) — Checklist 51 item pre-prod.
- [`docs/incident-response-playbook.md`](docs/incident-response-playbook.md) — Incident response.
- [`docs/privacy-dpia-template.md`](docs/privacy-dpia-template.md) — DPIA template.
- [`docs/gdpr/`](docs/gdpr/) — Sub-processor list, cookie consent UX, children data policy.

### Brand & Product
- [`docs/brand-guidelines.md`](docs/brand-guidelines.md) — Brand identity, palette, voice/tone.
- [`docs/onboarding-flow.md`](docs/onboarding-flow.md) — Blueprint onboarding FASE D.
- [`docs/FAQ.md`](docs/FAQ.md) — FAQ pubbliche.
- [`docs/glossary.md`](docs/glossary.md) — Glossario di prodotto.
- [`HANDOFF_BUNDLE.md`](HANDOFF_BUNDLE.md) — Design system source of truth.

### Sales & Marketing
- [`docs/sales/playbook.md`](docs/sales/playbook.md) · [`docs/sales-pitch-deck-outline.md`](docs/sales-pitch-deck-outline.md)
- [`docs/marketing/landing-variants.md`](docs/marketing/landing-variants.md) · [`docs/marketing-copy-library.md`](docs/marketing-copy-library.md)
- [`docs/email/onboarding-sequence.md`](docs/email/onboarding-sequence.md) · [`docs/press-kit.md`](docs/press-kit.md)
- [`docs/competitor-analysis.md`](docs/competitor-analysis.md) · [`docs/customer-success-playbook.md`](docs/customer-success-playbook.md)

### Financial & Business
- [`docs/pricing-strategy-analysis.md`](docs/pricing-strategy-analysis.md) · [`docs/decisions/credit-pack-pricing.md`](docs/decisions/credit-pack-pricing.md)
- [`docs/financial/`](docs/financial/) — Financial model, unit economics, cap table.
- [`docs/investor-faq.md`](docs/investor-faq.md) · [`docs/business/`](docs/business/) — Board deck, OKR, founder update.
- [`docs/kpi-definitions.md`](docs/kpi-definitions.md) · [`docs/hiring/plan-and-jd.md`](docs/hiring/plan-and-jd.md)

### Growth & Integrations
- [`docs/growth/`](docs/growth/) — Affiliate, partnership, content calendar.
- [`docs/integrations/`](docs/integrations/) — QuickBooks, Fatture in Cloud, PSD2 (pianificati).

### Dev & Process
- [`docs/dev/coding-standards.md`](docs/dev/coding-standards.md) · [`docs/dev/git-workflow.md`](docs/dev/git-workflow.md)
- [`docs/dev/deployment-runbook.md`](docs/dev/deployment-runbook.md) · [`docs/ai/prompt-library.md`](docs/ai/prompt-library.md)
- [`docs/i18n/translation-style-guide.md`](docs/i18n/translation-style-guide.md) · [`docs/community/`](docs/community/)

---

## Quick start (developer)

### Prerequisiti

- **Node.js ≥ 22** (`node --version`)
- **npm ≥ 9** (incluso con Node)
- **Git**

Guida estesa: [`docs/dev/local-development-setup.md`](docs/dev/local-development-setup.md).

### Setup

```bash
# Clone
git clone https://github.com/cnayaz/anlyra.git
cd anlyra

# Dipendenze
npm install

# Environment
cp .env.example .env.local
# Modifica .env.local con i valori locali (vedi local-development-setup.md)

# Database (SQLite in dev)
npm run db:push      # applica lo schema Prisma
npm run db:seed      # popola dati demo

# Dev server
npm run dev
```

App su [http://localhost:3000](http://localhost:3000).

### Script utili

```bash
npm run dev          # Dev server (porta 3000)
npm run build        # Build di produzione
npm run start        # Avvia build di produzione
npm run lint         # ESLint
npm run typecheck    # TypeScript (tsc --noEmit)
npm run db:push      # Applica schema Prisma al DB
npm run db:seed      # Seed dati demo
npm run db:generate  # Genera Prisma Client
npx prisma studio    # Browser visuale del DB
```

### Demo mode (storico)

In passato la pagina di login esponeva un pulsante "Accedi con demo" che faceva
`POST /api/auth/login-demo` con sessione cookie pre-seeded.

> **Rimosso in FASE D.** L'accesso ora avviene tramite **signup reale** (email/password o
> OAuth Google/Microsoft) con verifica email obbligatoria. L'endpoint `login-demo` non esiste più.
> Per dati di prova in locale usa `npm run db:seed`.

---

## Struttura del progetto

```
anlyra/
├── src/
│   ├── app/
│   │   ├── [locale]/                  # Route locale-aware (it, en)
│   │   │   ├── page.tsx               # Landing pubblica
│   │   │   ├── login/  signup/        # Auth (FASE D)
│   │   │   ├── verify-email/          # Verifica email
│   │   │   ├── welcome/  onboarding/  # Onboarding wizard (FASE D)
│   │   │   ├── pricing/  legal/       # Pricing + pagine legali
│   │   │   └── (dashboard)/           # Dashboard (auth richiesta)
│   │   │       ├── overview/  ai/  finance/
│   │   │       ├── operations/  market/  settings/
│   │   ├── api/
│   │   │   ├── auth/                  # NextAuth + verify-email + 2fa
│   │   │   ├── onboarding/            # Step wizard
│   │   │   └── ...                    # REST endpoints
│   │   ├── robots.ts  sitemap.ts      # SEO generators
│   │   └── layout.tsx                 # Root layout + metadata
│   ├── auth.ts                        # NextAuth (Node: Prisma + bcrypt)
│   ├── auth.config.ts                 # NextAuth edge-safe (middleware)
│   ├── components/
│   │   ├── ui/                        # Design system (shadcn custom)
│   │   └── dashboard/                 # Layout (Sidebar, Topbar, ...)
│   ├── lib/
│   │   ├── auth/                      # config, current-user, session, tokens
│   │   ├── billing/  email/  seo/     # Stripe, Resend, Schema.org
│   │   └── prisma.ts                  # Prisma client singleton
│   ├── messages/                      # i18n (it.json, en.json)
│   └── middleware.ts                  # Auth + i18n routing
├── prisma/
│   ├── schema.prisma                  # Schema DB
│   ├── migrations/                    # Storia migration SQL
│   └── seed.ts                        # Seed dati demo
├── public/                            # Asset statici
├── docs/                              # Documentazione (~50 file)
└── HANDOFF_BUNDLE.md                  # Design system source of truth
```

---

## Architecture overview

```
                       [Browser]
                           │
                           ▼
                     [Vercel Edge]
                           │
          ┌────────────────┴────────────────┐
          ▼                                  ▼
 [middleware.ts]                  [Next.js 14 App Router]
 (auth.config.ts                  (Server + Client Components)
  edge-safe routing)                       │
                                           ▼
                                    [auth.ts / Prisma]
                                           │
                                           ▼
                                [Supabase Postgres (EU)]

  Servizi esterni:
   • Anthropic Claude  → insight / alert / forecast
   • Stripe            → subscription + credit pack
   • Resend            → email transazionali
   • Upstash Redis     → rate limiting (pianificato)
   • Sentry            → error monitoring (pianificato)
```

---

## Contributing

Anlyra è un progetto **proprietario** in fase pre-launch. Non accettiamo contributi pubblici al
momento. Le convenzioni interne di sviluppo sono in [`docs/dev/coding-standards.md`](docs/dev/coding-standards.md)
e [`docs/dev/git-workflow.md`](docs/dev/git-workflow.md).

- **Lavorare con noi**: [hello@anlyra.it](mailto:hello@anlyra.it)
- **Partnership**: [partnerships@anlyra.it](mailto:partnerships@anlyra.it)
- **Security disclosure**: vedi [`docs/SECURITY.md`](docs/SECURITY.md) §9.

---

## License

Proprietary. Tutti i diritti riservati. Copyright © 2026 Anlyra.

Uso non autorizzato di codice o brand non consentito — vedi
[`docs/brand-guidelines.md`](docs/brand-guidelines.md) (approval workflow).

---

## Team & Contatti

- **Sito** (pre-launch): [anlyra.it](https://anlyra.it)
- **Email generale**: hello@anlyra.it
- **Partnership**: partnerships@anlyra.it
- **Security / Privacy**: security@anlyra.it · privacy@anlyra.it
- **Team**: _[placeholder — da personalizzare con fondatore, ruoli, location]_

---

**Made in Italy — analytics e AI advisory per le PMI italiane.**
