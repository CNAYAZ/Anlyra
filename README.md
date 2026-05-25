# Anlyra

> Analytics di livello enterprise per PMI italiane. Privacy seria, sul serio.

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-pre--launch-yellow.svg)](https://anlyra.it)

---

## Cosa è Anlyra

Anlyra è una piattaforma B2B SaaS analytics per PMI italiane. L'utente carica dati finanziari e operativi, l'AI (powered by Anthropic Claude) genera insights, alert e forecast.

**Target**: PMI italiane con fatturato 1M–50M €, che vogliono analytics di livello enterprise senza costi e complessità di SAP/Oracle.

**Differenziazione**:
- Italiano-first, made in Italy
- Privacy seria (server EU, no AI training su dati cliente, no data selling)
- AI come strumento, non sostituto (confidence scores, dati sottostanti sempre visibili)
- Premium ma accessibile (Pro €49/mese, Avanzato €149/mese)

[Sito pubblico (in arrivo)](https://anlyra.it) · [Pricing](https://anlyra.it/it/pricing) · [Privacy](https://anlyra.it/it/legal/privacy)

---

## Stack tecnico

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, Server Components) |
| Language | TypeScript 5 strict |
| Styling | Tailwind CSS 3 + custom design system |
| UI components | shadcn/ui + Radix UI primitives |
| ORM | Prisma 5 |
| DB (dev) | SQLite (local file) |
| DB (prod) | Supabase Postgres (EU region) |
| Auth (current) | Custom cookie session (`pro_session`, httpOnly) |
| Auth (planned) | NextAuth v5 — email/password + Google + 2FA |
| AI | Anthropic Claude (insights, alerts, forecasting) |
| Email | Resend (transactional) |
| Payments | Stripe (subscriptions + one-time credit packs) |
| Cache / rate limit | Upstash Redis |
| Hosting | Vercel (target) |
| Analytics | TBD (PostHog vs Mixpanel evaluation) |
| Error tracking | Sentry (planned) |
| i18n | next-intl (IT primary, EN secondary) |

---

## Stato del progetto

**Status**: pre-launch (development phase).

Cosa è pronto:
- ✅ Sito pubblico (landing, pricing 3-tier, legal pages, login)
- ✅ Dashboard funzionante (overview, finance, AI insights/alerts, operations, market, settings)
- ✅ Design system custom (palette panna+sage, shadcn/ui restyled)
- ✅ i18n IT/EN allineato
- ✅ Auth demo funzionante
- ✅ SEO foundation (robots, sitemap, Schema.org JSON-LD, OG metadata)
- ✅ Email transactional infrastructure (Resend + 5 template italiani)
- ✅ Stripe webhook integration base

Cosa manca pre-launch commerciale:
- 🚧 Auth reale — signup + email verify + 2FA (FASE D)
- 🚧 Stripe Tax + price IDs production
- 🚧 Migration SQLite → Supabase Postgres
- 🚧 Deploy Vercel + DNS production
- 🚧 Test E2E suite (Playwright)
- 🚧 Sentry integration

Roadmap dettagliata: vedi [`docs/`](docs/) sotto.

---

## Documentazione

Tutta la documentazione di progetto vive in [`docs/`](docs/):

### Setup e deploy
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — Guida deploy production (Vercel + Supabase + DNS + Resend + Stripe)
- [`docs/postgres-migration-plan.md`](docs/postgres-migration-plan.md) — Migration SQLite → Supabase Postgres
- [`docs/stripe-setup.md`](docs/stripe-setup.md) — Stripe production setup (products, tax, webhook, customer portal)
- [`docs/seo-checklist.md`](docs/seo-checklist.md) — SEO pre-launch checklist
- [`docs/seo-schema-org.md`](docs/seo-schema-org.md) — Schema.org JSON-LD implementation

### Security e compliance
- [`docs/SECURITY.md`](docs/SECURITY.md) — Security posture + GDPR compliance map (per enterprise prospects)

### Brand e UX
- [`docs/brand-guidelines.md`](docs/brand-guidelines.md) — Brand identity, palette, typography, voice/tone
- [`docs/onboarding-flow.md`](docs/onboarding-flow.md) — UX blueprint per FASE D (signup → first insight)
- [`docs/FAQ.md`](docs/FAQ.md) — FAQ pubbliche (47 domande in 8 categorie)
- [`HANDOFF_BUNDLE.md`](HANDOFF_BUNDLE.md) — Design system technical source of truth

### Decision tracking
- [`docs/decisions/`](docs/decisions/) — Decision log (es. credit pack pricing)

---

## Quick start (developer)

### Prerequisites

- Node.js 18+ (verifica con `node --version`)
- npm 9+ (incluso con Node)
- Git

### Setup

```bash
# Clone repo
git clone https://github.com/cnayaz/anlyra.git
cd anlyra

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your local values

# Initialize database
npx prisma generate
npx prisma migrate deploy

# Seed demo data
npm run seed

# Start dev server
npm run dev
```

App disponibile su [http://localhost:3000](http://localhost:3000).

### Demo login

Clicca **"Accedi con demo"** sulla pagina di login — nessuna credenziale richiesta.

La sessione demo è pre-seeded con:
- User: `demo@pro.app`
- Organization: `Acme Analytics` (slug: `acme`)
- Plan: Pro

### Useful scripts

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npm run seed         # Populate DB with demo data
npx prisma studio    # Visual DB browser
npx tsc --noEmit     # TypeScript check (no compile)
```

---

## Project structure

```
anlyra/
├── src/
│   ├── app/                       # Next.js 14 App Router
│   │   ├── [locale]/              # Locale-aware routes (it, en)
│   │   │   ├── page.tsx           # Landing pubblica
│   │   │   ├── login/
│   │   │   ├── pricing/
│   │   │   ├── legal/             # Privacy, terms, cookies
│   │   │   └── (dashboard)/       # Dashboard (auth required)
│   │   │       ├── overview/
│   │   │       ├── ai/
│   │   │       ├── finance/
│   │   │       ├── operations/
│   │   │       ├── market/
│   │   │       └── settings/
│   │   ├── api/                   # API routes (REST endpoints)
│   │   ├── robots.ts              # SEO: robots.txt generator
│   │   ├── sitemap.ts             # SEO: sitemap.xml generator
│   │   ├── layout.tsx             # Root layout + global metadata
│   │   ├── opengraph-image.tsx    # Dynamic OG image
│   │   └── not-found.tsx          # 404 page
│   ├── components/
│   │   ├── ui/                    # Design system (shadcn custom)
│   │   └── dashboard/             # Layout components (Sidebar, Topbar, etc.)
│   ├── lib/
│   │   ├── auth/                  # Auth utilities (custom cookie + planned NextAuth)
│   │   ├── billing/               # Plans, Stripe integration
│   │   ├── email/                 # Resend + templates
│   │   ├── seo/                   # Schema.org JSON-LD helpers
│   │   └── prisma.ts              # Prisma client singleton
│   ├── messages/                  # i18n translations (it.json, en.json)
│   └── middleware.ts              # Next.js middleware (auth + i18n routing)
├── prisma/
│   ├── schema.prisma              # DB schema (~40 models)
│   ├── migrations/                # SQL migration history
│   ├── seed.ts                    # Main seed script
│   ├── seed-insights.ts           # Modular seed: AI insights
│   └── seed-alerts.ts             # Modular seed: AI alerts
├── public/                        # Static assets
├── docs/                          # Project documentation (see Documentation section)
└── HANDOFF_BUNDLE.md              # Design system source of truth
```

---

## Architecture overview

```
                [Browser]
                    ↓
                [Vercel Edge]
                    ↓
    [Next.js 14 App Router (Serverless)]
          ↓                    ↓
    [Server Components]    [Client Components]
          ↓
    [Prisma Client]
          ↓
    [Supabase Postgres (EU)]
```

External services:

- **Anthropic Claude** — AI insights generation
- **Stripe** — payments + subscriptions
- **Resend** — transactional emails
- **Upstash Redis** — rate limiting
- **Sentry** — error monitoring (planned)

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
