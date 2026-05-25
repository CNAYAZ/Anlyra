# Anlyra

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)
![License](https://img.shields.io/badge/License-Proprietary-red)
![Status](https://img.shields.io/badge/Status-Pre--launch-orange)

**Analytics AI per PMI italiane.** Insights finanziari, operativi e di mercato generati automaticamente — senza data scientist, senza consulenti.

> Privacy seria, sul serio. Dati EU. Nessun training AI.

---

## Cosa è Anlyra

Anlyra è una piattaforma SaaS che aiuta piccoli e medi team italiani a capire i propri dati aziendali attraverso analisi AI in linguaggio naturale. L'utente importa i dati (CSV o integrazioni native), e Anlyra genera automaticamente insights, previsioni e benchmark di settore.

**Target**: PMI italiane, 2–50 dipendenti, fatturato €500k–€20M  
**Modello**: SaaS a subscription (Pro €49/mese, Avanzato €149/mese, Enterprise custom)  
**Lingua primaria**: Italiano; interfaccia bilingue IT/EN

---

## Stack tecnico

| Layer | Tecnologia | Versione |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.18 |
| Linguaggio | TypeScript | 5.6.3 |
| Runtime | Node.js | ≥ 22 |
| ORM | Prisma | 5.22.0 |
| Database (dev) | SQLite | — |
| Database (prod) | Supabase Postgres | — |
| AI | Anthropic Claude SDK | 0.32.1 |
| Pagamenti | Stripe | 17.2.0 |
| Email | Resend | 4.0.0 |
| Cache / Rate limit | Upstash Redis | 1.34.0 |
| i18n | next-intl | 3.25.1 |
| Data fetching | TanStack Query | 5.x |
| Tabelle | TanStack Table | 8.x |
| Grafici | Recharts + D3 | 2.13 / 7.9 |
| Animazioni | Framer Motion | 11.x |
| UI | shadcn/ui (Radix UI) | — |
| Stile | Tailwind CSS | 3.4.14 |
| Validazione | Zod | 3.23.8 |
| State | Zustand | 5.0.1 |
| PDF | @react-pdf/renderer | 4.0.0 |
| CSV | PapaParse | 5.4.1 |

---

## Stato del progetto

### Pronto ✅

| Feature | Note |
|---|---|
| Autenticazione | Cookie custom `pro_session` (httpOnly, SameSite=lax) |
| Billing | Stripe checkout, portal, webhook (6 eventi) |
| AI Chat | Conversazioni in IT/EN via Claude |
| AI Insights | Generazione automatica anomalie e trend |
| AI Forecasting | Proiezioni ricavi/costi 3–12 mesi |
| AI Benchmark | Confronto metriche con benchmark settore |
| AI Alerts | Alert configurabili su soglie KPI |
| Analisi finanziaria | Revenue, costi, cashflow, budget vs actual |
| Analisi di mercato | Competitor, trend, positioning |
| Analisi operativa | Team, clienti, efficienza |
| Import dati | CSV con wizard di mapping guidato |
| Report + PDF | Generazione report e export PDF |
| Custom dashboards | Drag-and-drop widget builder |
| Condivisione report | Link pubblici o protetti da password |
| Gestione team | Inviti, ruoli, membership |
| Integrazioni | Registry con connect/disconnect/sync |
| Design system | shadcn/ui + palette Anlyra (panna + sage) |
| i18n | Italiano e inglese (next-intl) |
| SEO | sitemap.xml, robots.txt, OG, JSON-LD Schema.org |
| Demo mode | Login senza credenziali via `/api/auth/login-demo` |

### Mancante pre-launch 🚧

| Item | Riferimento |
|---|---|
| Stripe price IDs in production | `docs/stripe-setup.md` |
| Migrazione SQLite → Supabase Postgres | `docs/postgres-migration-plan.md` |
| RESEND_API_KEY configurata | `docs/DEPLOY.md` §3.3 |
| Security headers (CSP, HSTS) | `docs/SECURITY.md` §3.3 |
| Prezzi credit pack finalizzati | `docs/decisions/credit-pack-pricing.md` |
| 2FA (UI pronta, attivazione mancante) | `docs/SECURITY.md` §3.2 |
| Certificazione NIS2 formale | `docs/SECURITY.md` §6 |

---

## Documentazione

| Documento | Descrizione |
|---|---|
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Guida deploy production su Vercel |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Security posture + GDPR compliance map |
| [`docs/stripe-setup.md`](docs/stripe-setup.md) | Setup Stripe production (prodotti, webhook, env) |
| [`docs/postgres-migration-plan.md`](docs/postgres-migration-plan.md) | Migrazione SQLite → Supabase Postgres |
| [`docs/onboarding-flow.md`](docs/onboarding-flow.md) | Blueprint onboarding 5-step (FASE D) |
| [`docs/brand-guidelines.md`](docs/brand-guidelines.md) | Brand book (palette, tipografia, voice/tone) |
| [`docs/FAQ.md`](docs/FAQ.md) | 37 FAQ pubbliche in italiano (8 categorie) |
| [`docs/seo-checklist.md`](docs/seo-checklist.md) | SEO checklist pre-lancio |
| [`docs/seo-schema-org.md`](docs/seo-schema-org.md) | Implementazione JSON-LD Schema.org |
| [`docs/decisions/credit-pack-pricing.md`](docs/decisions/credit-pack-pricing.md) | ADR: strategia prezzi credit pack |

---

## Quick start

### Prerequisiti

- Node.js ≥ 22
- pnpm / npm / yarn
- Chiave API Anthropic (obbligatoria per funzioni AI)

### Installazione

```bash
git clone https://github.com/CNAYAZ/Anlyra.git
cd Anlyra
npm install
```

### Configurazione

```bash
cp .env.example .env.local
# Modifica .env.local con le tue chiavi
```

Variabili minime per sviluppo:

```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="qualsiasi-stringa-random-32-char"
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Database + seed

```bash
npm run db:push      # Crea schema SQLite
npm run db:seed      # Popola con dati demo
```

Il seed crea un utente demo (`demo@pro.app`) con un'organizzazione su piano Pro e dati finanziari di esempio per sviluppo locale.

### Dev server

```bash
npm run dev
# → http://localhost:3000
```

### Demo mode

Sulla pagina di login, clicca **"Accedi con demo"** — nessuna email o password richiesta. Il pulsante fa POST a `/api/auth/login-demo` e imposta la sessione demo automaticamente.

### Comandi utili

```bash
npm run typecheck    # Verifica tipi TypeScript
npm run lint         # ESLint
npm run build        # Build production
```

---

## Project structure

```
anlyra/
├── docs/                          # Documentazione progetto
│   ├── decisions/                 # Architecture Decision Records
│   └── *.md
├── prisma/
│   ├── schema.prisma              # Schema DB (SQLite dev / Postgres prod)
│   └── seed.ts                    # Seed dati demo
├── public/
│   └── integrations/              # Loghi integrazioni (.svg)
├── src/
│   ├── app/
│   │   ├── [locale]/              # Route i18n (it / en)
│   │   │   ├── (dashboard)/       # Pagine protette (auth required)
│   │   │   ├── login/
│   │   │   ├── onboarding/
│   │   │   ├── pricing/
│   │   │   ├── legal/             # Privacy, Terms, Cookies
│   │   │   └── ...
│   │   ├── api/
│   │   │   ├── ai/                # Chat, insights, forecast, alerts
│   │   │   ├── analysis/          # Financial, market, operations
│   │   │   ├── billing/           # Checkout, portal, credits
│   │   │   ├── data/              # Import CSV, manual entry, history
│   │   │   ├── integrations/      # Connect / sync / disconnect
│   │   │   ├── reports/           # Generazione report + PDF
│   │   │   └── webhooks/stripe/   # Stripe webhook handler
│   │   ├── layout.tsx             # Root layout + metadata + JSON-LD
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components/
│   │   ├── ai/                    # Chat, forecasting, benchmarks
│   │   ├── billing/               # Plan cards, credit display, gates
│   │   ├── charts/                # Recharts wrappers
│   │   ├── dashboard/             # Nav, layout, widget grid
│   │   ├── landing/               # Landing page sections
│   │   ├── pricing/               # Pricing page
│   │   └── ui/                    # Design system (shadcn/ui)
│   ├── lib/
│   │   ├── ai/                    # Anthropic client + prompt builders
│   │   ├── auth/                  # Session utilities
│   │   ├── billing/               # Plans, feature gates, context
│   │   ├── email/                 # Resend + 5 template email
│   │   ├── seo/                   # JSON-LD schema helpers
│   │   ├── stripe/                # Price IDs, checkout helpers
│   │   └── sync/                  # Integration sync providers
│   ├── messages/
│   │   ├── it.json                # Traduzioni italiano (primario)
│   │   └── en.json                # Traduzioni inglese
│   └── i18n/                      # next-intl config
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│                      Browser / Client                         │
│         Next.js App Router · React 18 · TanStack Query        │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼──────────────────────────────────┐
│                      Next.js Server                           │
│                                                               │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────┐  │
│  │  Pages (RSC)   │  │  Route Handlers  │  │ Middleware   │  │
│  │  /[locale]/... │  │  /api/...        │  │ i18n + auth  │  │
│  └────────────────┘  └────────┬─────────┘  └─────────────┘  │
└───────────────────────────────┼──────────────────────────────┘
                                │
          ┌─────────────────────┼──────────────┬──────────────┐
          │                     │              │              │
┌─────────▼──────┐  ┌──────────▼────┐  ┌──────▼──────┐  ┌───▼──────┐
│    Prisma ORM   │  │  Anthropic    │  │   Stripe    │  │  Resend  │
│ SQLite (dev)    │  │  Claude API   │  │  Billing    │  │  Email   │
│ Supabase (prod) │  │  AI Engine    │  │  Webhooks   │  │ 5 tpl.   │
└─────────────────┘  └───────────────┘  └─────────────┘  └──────────┘
          │
┌─────────▼──────┐
│  Upstash Redis  │
│  Rate limiting  │
└─────────────────┘
```

**Flusso autenticazione**: sessione custom `pro_session` (cookie httpOnly, SameSite=lax) — nessuna dipendenza NextAuth a runtime.

**Flusso billing**: Stripe Checkout → webhook → Prisma update → UI reattiva via TanStack Query.

**Flusso AI**: richiesta utente → gate crediti → Anthropic Claude API → salvataggio insight → decremento `aiCreditsBalance`.

---

## Contributing

Anlyra è un progetto proprietario in fase pre-launch. Non accettiamo contributi pubblici al momento.

Se sei interessato a:
- **Lavorare con noi**: scrivi a [hello@anlyra.it](mailto:hello@anlyra.it) (attivazione pre-launch)
- **Partnership**: scrivi a [partnerships@anlyra.it](mailto:partnerships@anlyra.it)
- **Security disclosure**: vedi [docs/SECURITY.md](docs/SECURITY.md) sezione 4.3

---

## License

Proprietary. Tutti i diritti riservati. Copyright © 2026 Anlyra.

Per uso non autorizzato del codice o del brand, vedi [docs/brand-guidelines.md](docs/brand-guidelines.md) sezione 10 (Approval workflow).

---

## Team

[Da personalizzare con dati reali: fondatore, contatti, location]

---

## Contatti

- **Sito web** (pre-launch): [anlyra.it](https://anlyra.it)
- **Email**: hello@anlyra.it (in attivazione)
- **GitHub**: questo repo
- **LinkedIn** (futuro): linkedin.com/company/anlyra

---

**Made in Italy with ❤️ for italian SMEs.**
