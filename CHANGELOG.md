# Changelog

Tutte le modifiche rilevanti a questo progetto sono documentate qui.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
il versionamento segue [Semantic Versioning](https://semver.org/lang/it/).

---

## [Unreleased]

### Added
- Email templates: trial-3days, trial-1day, trial-expired, subscription-canceled
- Documenti operativi: CHANGELOG, CONTRIBUTING, LICENSE, CODE_OF_CONDUCT
- Config: .editorconfig, .prettierrc, GitHub PR/issue templates
- Docs: growth (partnership, affiliate, content calendar), financial (unit economics, financial model, cap table), GDPR (cookie consent, subprocessors, children data policy)

---

## [0.5.0] — 2026-05-25

### Added
- Batch documentazione collaterale: customer-success-playbook, TESTING, incident-response-playbook, competitor-analysis, sales-pitch-deck-outline, marketing-copy-library, status-page-content, press-kit, privacy-dpia-template
- FAQ pubbliche (47 domande, 8 categorie) in `docs/FAQ.md`
- Glossario termini business + tech in `docs/glossary.md`
- Roadmap pubblica Q2 2026 → Q2 2027 in `docs/roadmap.md`
- Decision log credit pack pricing in `docs/decisions/credit-pack-pricing.md`

### Changed
- README.md: ristrutturato con stack, demo, setup, env vars, struttura directory

### Fixed
- Placeholder prezzi credit pack: sostituiti valori specifici con `€[da definire]` in tutti i documenti

---

## [0.4.0] — 2026-05-10

### Added
- Multi-lingua: locale IT (primario) + EN via next-intl
- Dashboard: Overview, Finance, AI Insights, AI Alerts, Operations, Market
- Dashboard custom: creazione e configurazione widget
- Settings: Profile, Team, Billing

### Changed
- Navigazione con breadcrumb locale-aware

---

## [0.3.0] — 2026-04-20

### Added
- Autenticazione: email/password + cookie custom `pro_session`
- Demo login via `/api/auth/login-demo` (utente `demo@pro.app`, piano PRO)
- Logout via reload assoluto a `/api/auth/logout`
- Team invite: invito per email, accettazione, membership

### Security
- Cookie `pro_session`: httpOnly, SameSite=lax, Secure in produzione
- Rate limiting sulle route di autenticazione

---

## [0.2.0] — 2026-04-01

### Added
- Integrazione Stripe: 3 piani (PRO, Avanzato, Enterprise) + credit pack
- Webhook Stripe per aggiornamento piano e conferma pagamento
- Email transazionali via Resend: welcome, verify-email, password-reset, payment-confirmed, team-invite
- Template email responsive con `baseLayout`

### Changed
- Piano PRO: 5 utenti, 200 AI credits/mese
- Piano Avanzato: 15 utenti, 700 AI credits/mese

---

## [0.1.0] — 2026-03-15

### Added
- Progetto Next.js 14 App Router con `src/` prefix
- Prisma ORM: schema iniziale, seed con org demo (`acme`) e utente demo
- UI base: shadcn/ui, Tailwind CSS, font Inter
- Landing page IT + EN
- Pricing page con toggle mensile/annuale
- Struttura i18n con next-intl

---

[Unreleased]: https://github.com/cnayaz/anlyra/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/cnayaz/anlyra/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/cnayaz/anlyra/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/cnayaz/anlyra/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/cnayaz/anlyra/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/cnayaz/anlyra/releases/tag/v0.1.0
