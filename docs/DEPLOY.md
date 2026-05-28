# Guida al Deploy in Produzione — Anlyra

**Stack:** Next.js 14.2 (App Router) · Prisma + Supabase Postgres · NextAuth v5 · Resend · Stripe · Vercel · Sentry
**Dominio:** `anlyra.it`
**Tempo stimato:** 3–4 ore la prima volta · ~30 min per i deploy successivi
**Status:** documento operativo — eseguire quando pronti per il launch.
**Audience:** founder / dev responsabile del deploy.

> Processo end-to-end. Per la migrazione DB vedi [`postgres-migration-plan.md`](postgres-migration-plan.md);
> per Stripe vedi [`stripe-setup.md`](stripe-setup.md); per la checklist di sicurezza pre-prod vedi
> [`security-audit-checklist.md`](security-audit-checklist.md); per il recovery dell'ambiente vedi
> [`codespace-recovery-procedure.md`](codespace-recovery-procedure.md).

---

## 1. Deploy overview

**Target architecture:**

```
  GoDaddy DNS (anlyra.it)
        │
        ▼
   Vercel Edge ──────► Next.js 14 (App Router, serverless)
                              │
                              ├─► Supabase Postgres (EU, Frankfurt)
                              ├─► Anthropic Claude (insight AI)
                              ├─► Stripe (subscription + credit pack)
                              ├─► Resend (email transazionali)
                              └─► Sentry (error monitoring)
```

Principi: region EU per il DB, HTTPS-only, env vars cifrate su Vercel, rollback istantaneo via
deploy immutabili.

---

## 2. Prerequisiti e account

| Servizio | Uso | Account |
|---|---|---|
| **Vercel** | Hosting Next.js | [vercel.com](https://vercel.com) |
| **Supabase** | Database Postgres EU | [supabase.com](https://supabase.com) |
| **Stripe** | Pagamenti e abbonamenti | [stripe.com](https://stripe.com) |
| **Resend** | Email transazionali | [resend.com](https://resend.com) |
| **Anthropic** | API Claude (insight AI) | [console.anthropic.com](https://console.anthropic.com) |
| **Sentry** | Error monitoring | [sentry.io](https://sentry.io) |
| **GoDaddy** | DNS dominio `anlyra.it` | già acquistato |

CLI utili in locale: `node ≥ 22`, `npm`, `stripe` CLI (test webhook), `git`, `vercel` CLI (opzionale).

---

## 3. Step 1 — Supabase Postgres setup

1. Crea un nuovo progetto Supabase, **region `eu-central-1` (Frankfurt)** per compliance GDPR.
2. Scegli una password DB robusta e salvala nel password manager.
3. In **Project Settings → Database → Connection string**, copia due URL:
   - **Connection pooling** (mode `Transaction`, porta **6543**) → `DATABASE_URL`
   - **Direct connection** (porta **5432**) → `DIRECT_URL`
4. Assicurati che la password nell'URL sia **URL-encoded** (`@`, `#`, ecc. vanno escapati).
5. In **Database → Backups**, verifica i backup giornalieri (point-in-time recovery sul piano Pro).
6. **Migration SQLite → Postgres:** segui [`postgres-migration-plan.md`](postgres-migration-plan.md)
   (aggiornamento provider `schema.prisma`, gestione dei modelli zombie, export/import dati demo).

```bash
# Migration: usa la connessione diretta (5432)
npx prisma migrate deploy   # DIRECT_URL
npx prisma generate
```

> **Importante:** a runtime Prisma usa `DATABASE_URL` (pooler 6543); le migration usano `DIRECT_URL`
> (5432). Entrambe obbligatorie.

---

## 4. Step 2 — Environment variables

Configurale su **Vercel → Project → Settings → Environment Variables** (scope: Production +
Preview). Mai committarle nel repo.

| Variabile | Scopo |
|---|---|
| `AUTH_SECRET` | Segreto NextAuth (genera con `openssl rand -base64 32`) |
| `AUTH_URL` | URL canonico (es. `https://anlyra.it`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | OAuth Google |
| `AUTH_MICROSOFT_ID` / `AUTH_MICROSOFT_SECRET` | OAuth Microsoft |
| `DATABASE_URL` | Postgres pooler (6543) |
| `DIRECT_URL` | Postgres diretto (5432, migration) |
| `STRIPE_SECRET_KEY` | Stripe API (live) |
| `STRIPE_WEBHOOK_SECRET` | Verifica firma webhook Stripe |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_ADVANCED` / `STRIPE_PRICE_ENTERPRISE` | Price ID per piano |
| `STRIPE_PRICE_CREDIT_PACK` | Price ID credit pack one-time |
| `RESEND_API_KEY` | Resend API |
| `RESEND_FROM_EMAIL` | Mittente verificato (es. `noreply@anlyra.it`) |
| `ANTHROPIC_API_KEY` | API Claude |
| `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` | Error monitoring + source maps |
| `CRON_SECRET` | Bearer per autenticare le cron route |
| `PLAN_PRO_*` / `PLAN_ADVANCED_*` / `PLAN_ENTERPRISE_*` | Limiti di piano parametrizzati |
| `NEXT_PUBLIC_APP_URL` | URL pubblico per link assoluti |

> Genera `AUTH_SECRET` e `CRON_SECRET` con `openssl rand -base64 32`. Verifica che i redirect URI
> OAuth (Google/Microsoft) puntino a `https://anlyra.it/api/auth/callback/...`.

---

## 5. Step 3 — Vercel deployment

1. **Import repository:** Vercel → Add New → Project → importa il repo GitHub.
2. **Framework preset:** Next.js (autorilevato).
3. **Build command:** `npm run build` (default). **Install:** `npm ci`. **Output:** default Next.js.
4. **Environment variables:** incolla quelle dello Step 2 (Production + Preview).
5. **Region:** seleziona una region EU per le funzioni serverless (coerenza data residency).
6. **Deploy:** lancia il primo deploy; verifica il build log (tsc + lint puliti, vedi
   [`dev/deployment-runbook.md`](dev/deployment-runbook.md)).

---

## 6. Step 4 — Stripe production

Procedura completa in [`stripe-setup.md`](stripe-setup.md). In sintesi:

1. Attiva l'account Stripe in modalità **live**.
2. Crea i **Product** e i **Price** (Pro, Avanzato, Enterprise mensile/annuale + credit pack).
   Copia i price ID nelle env (`STRIPE_PRICE_*`).
3. Configura il **webhook endpoint**: `https://anlyra.it/api/stripe/webhook`. Eventi minimi:
   `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`.
4. Copia il **signing secret** in `STRIPE_WEBHOOK_SECRET`.
5. Configura **Stripe Tax** (IVA italiana) e il **Customer Portal** (gestione abbonamento self-service).
6. Test con `stripe trigger checkout.session.completed` prima del go-live.

---

## 7. Step 5 — Resend domain verification

1. In Resend → Domains, aggiungi `anlyra.it`.
2. Inserisci nel DNS (GoDaddy) i record forniti:
   - **SPF** (TXT) — autorizza Resend a inviare per il dominio.
   - **DKIM** (CNAME/TXT) — firma le email.
   - **DMARC** (TXT) — policy `p=quarantine` o `p=reject` (consigliato dopo verifica).
3. Attendi la verifica (può richiedere fino a qualche ora per la propagazione DNS).
4. Imposta `RESEND_FROM_EMAIL` su un mittente del dominio verificato.

---

## 8. Step 6 — DNS configuration (GoDaddy)

| Record | Host | Valore | Note |
|---|---|---|---|
| A | `@` | IP Vercel (`76.76.21.21`) | Apex → Vercel |
| CNAME | `www` | `cname.vercel-dns.com` | www → Vercel |
| TXT (SPF) | `@` | fornito da Resend | Email |
| CNAME/TXT (DKIM) | fornito da Resend | fornito da Resend | Email |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=quarantine; rua=...` | Email policy |

1. In Vercel → Project → Domains, aggiungi `anlyra.it` e `www.anlyra.it`.
2. Vercel mostra i record DNS attesi; replicali in GoDaddy.
3. Imposta il redirect `www` → apex (o viceversa) come canonico.
4. Attendi la propagazione e il provisioning del certificato TLS (automatico).

---

## 9. Step 7 — Cron jobs

In `vercel.json` definisci i cron (autenticati via `CRON_SECRET`):

```json
{
  "crons": [
    { "path": "/api/cron/trial-check", "schedule": "0 6 * * *" }
  ]
}
```

- **trial-check:** verifica i trial in scadenza, invia email (3 giorni / 1 giorno / scaduto) e
  aggiorna lo stato dell'organizzazione. La route valida l'header `Authorization: Bearer $CRON_SECRET`.
- Future cron (sync integrazioni QuickBooks/PSD2) seguiranno lo stesso pattern una volta implementate.

---

## 10. Step 8 — Sentry integration

1. Crea un progetto Sentry (piattaforma Next.js).
2. Imposta `SENTRY_DSN` e `SENTRY_AUTH_TOKEN` nelle env.
3. Configura l'upload delle **source maps** in build (per stack trace leggibili).
4. Verifica il **PII filtering** (no dati sensibili negli eventi). Retention eventi: 90 giorni.

---

## 11. Step 9 — Post-deploy smoke test

Verifica manuale dei flussi critici subito dopo il deploy:

URL critici (10):

1. `https://anlyra.it/it` — landing
2. `https://anlyra.it/en` — landing EN
3. `https://anlyra.it/it/pricing` — pricing
4. `https://anlyra.it/it/legal/privacy` — privacy
5. `https://anlyra.it/it/login`
6. `https://anlyra.it/it/signup`
7. `https://anlyra.it/it/overview` (redirect a login se non autenticato)
8. `https://anlyra.it/robots.txt`
9. `https://anlyra.it/sitemap.xml`
10. `https://anlyra.it/api/health` (se presente)

Auth flow E2E:

- Signup con email/password → ricezione email di verifica → verifica → login.
- Login OAuth Google/Microsoft.
- Onboarding wizard (info org → settore → import skip → invite) → primo insight.
- Checkout Stripe (test card in modalità live controllata) → conferma → stato piano aggiornato.

Riferimento checklist sicurezza: [`security-audit-checklist.md`](security-audit-checklist.md).

---

## 12. Step 10 — Monitoring setup

- **Uptime:** monitor esterno sui URL critici (es. UptimeRobot/BetterStack), alert su downtime.
- **Errori:** alert Sentry su nuovi issue P0/P1.
- **Stripe:** alert su `invoice.payment_failed` e webhook non recapitati.
- **Status page:** pubblica su `status.anlyra.it` (contenuto in [`status-page-content.md`](status-page-content.md)).

---

## 13. Rollback procedure

1. **Vercel:** Deployments → seleziona l'ultimo deploy stabile → **Promote to Production** (rollback istantaneo, immutabile).
2. **Database:** se una migration ha causato il problema, valuta il restore PITR Supabase
   (attenzione alla perdita dati nella finestra). Migration distruttive vanno evitate (vedi
   [`postgres-migration-plan.md`](postgres-migration-plan.md)).
3. **Env vars:** se la causa è una variabile errata, correggi e re-deploy.
4. Comunica l'incident secondo [`incident-response-playbook.md`](incident-response-playbook.md).

---

## 14. Troubleshooting deploy

| Sintomo | Causa probabile | Azione |
|---|---|---|
| Build fallisce su tsc/lint | Errori type/lint non risolti | Esegui `npm run typecheck` e `npm run lint` in locale prima del push |
| 500 sulle route | Env var mancante (`AUTH_SECRET`, `DATABASE_URL`) | Verifica le env su Vercel; controlla i function log |
| OAuth redirect mismatch | Redirect URI non registrato | Allinea i redirect URI Google/Microsoft a `…/api/auth/callback/...` |
| Webhook Stripe non arriva | Endpoint/secret errati | Verifica URL endpoint e `STRIPE_WEBHOOK_SECRET`; ricontrolla i log eventi Stripe |
| Email non recapitate | DNS non propagato / dominio non verificato | Verifica SPF/DKIM/DMARC su Resend |
| `prisma migrate` fallisce | URL/porta errati | Usa `DIRECT_URL` (5432) per le migration, password URL-encoded |
| Cron non parte | `CRON_SECRET` mancante | Imposta la env e verifica l'header `Authorization` nella route |

---

**Status:** documento operativo. Eseguire al go-live.
**Cross-ref:** [`postgres-migration-plan.md`](postgres-migration-plan.md) · [`stripe-setup.md`](stripe-setup.md) · [`security-audit-checklist.md`](security-audit-checklist.md) · [`codespace-recovery-procedure.md`](codespace-recovery-procedure.md).
**Last updated:** 2026-05-28.
