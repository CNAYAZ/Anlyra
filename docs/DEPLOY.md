# Guida al Deploy in Produzione — Anlyra

**Stack:** Next.js 14 (App Router) · Prisma + Supabase Postgres · Resend · Stripe · Vercel
**Dominio:** `anlyra.it`
**Tempo stimato:** 3–4 ore la prima volta · ~30 min per i deploy successivi
**Status:** documento di pianificazione — eseguire quando pronti per il launch

> Questo documento descrive il processo end-to-end. Per la migrazione DB da SQLite a
> Postgres, vedere `docs/postgres-migration-plan.md`. Per la checklist SEO, vedere
> `docs/seo-checklist.md`.

---

## Sezione 1 — Prerequisiti e account

Servizi necessari (tutti hanno tier gratuito per iniziare):

| Servizio | Uso | Account |
|---|---|---|
| **Vercel** | Hosting Next.js | [vercel.com](https://vercel.com) |
| **Supabase** | Database Postgres | [supabase.com](https://supabase.com) |
| **Resend** | Email transazionali | [resend.com](https://resend.com) |
| **Stripe** | Pagamenti e abbonamenti | [stripe.com](https://stripe.com) |
| **Anthropic** | API Claude (insights AI) | [console.anthropic.com](https://console.anthropic.com) |
| **GoDaddy** | DNS dominio `anlyra.it` | già acquistato |

Strumenti CLI utili in locale:
- `node` ≥ 18.17, `npm`
- `stripe` CLI (per testare i webhook localmente)
- `git`

---

## Sezione 2 — Setup Supabase

1. Crea un nuovo progetto su Supabase, **region `eu-central-1` (Frankfurt)** per compliance GDPR.
2. Scegli una password DB robusta e salvala nel password manager.
3. In **Project Settings → Database → Connection string**, copia due URL:
   - **Connection pooling** (mode `Transaction`, porta **6543**) → `DATABASE_URL`
   - **Direct connection** (porta **5432**) → `DIRECT_URL`
4. Assicurati che la password nell'URL sia **URL-encoded** (caratteri speciali come `@`, `#` vanno escapizzati).
5. In **Database → Backups**, verifica che i backup giornalieri siano attivi (richiede piano Pro per point-in-time recovery).

Aggiorna `prisma/schema.prisma` al provider Postgres (vedi `docs/postgres-migration-plan.md` §4) ed esegui le migration con `DIRECT_URL`:

```bash
npx prisma migrate deploy   # usa DIRECT_URL per la connessione diretta
npx prisma generate
```

> **Importante:** Prisma Client a runtime usa `DATABASE_URL` (pooler 6543). Le migration
> usano `DIRECT_URL` (5432). Entrambe le variabili sono obbligatorie.

---

## Sezione 3 — Setup Vercel

1. **Import del repository:** da Vercel → Add New → Project → importa il repo GitHub.
2. **Framework preset:** Next.js (autorilevato).
3. **Build command:** `npm run build` (default).
4. **Output directory:** `.next` (default).
5. **Environment variables:** vedi Sezione 4 — inserire prima del primo deploy.
6. **Region:** imposta la function region su `fra1` (Frankfurt) per minimizzare la latenza verso Supabase EU.

Dopo il primo deploy, Vercel assegna un URL `*.vercel.app`. Il dominio custom si configura nella Sezione 7.

---

## Sezione 4 — Variabili ambiente

Configurare in **Vercel → Settings → Environment Variables** (scope: Production).

### Database
```
DATABASE_URL    = postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL      = postgresql://...@...pooler.supabase.com:5432/postgres
```

### Auth e sito
```
NEXTAUTH_URL          = https://anlyra.it
NEXT_PUBLIC_SITE_URL  = https://anlyra.it
```

> L'app usa un cookie di sessione custom `pro_session`. `NEXT_PUBLIC_SITE_URL` è usato da
> robots/sitemap/OG metadata.

### AI
```
ANTHROPIC_API_KEY     = sk-ant-api03-...
EXCHANGE_RATE_API_KEY = ...        # opzionale, conversione valute
```

### Email (Resend)
```
RESEND_API_KEY  = re_...
RESEND_FROM     = "Anlyra <noreply@anlyra.it>"
```

### Stripe
```
STRIPE_SECRET_KEY              = sk_live_...
STRIPE_WEBHOOK_SECRET          = whsec_...
STRIPE_PRICE_PRO_MONTHLY       = price_...
STRIPE_PRICE_PRO_YEARLY        = price_...
STRIPE_PRICE_ADVANCED_MONTHLY  = price_...
STRIPE_PRICE_ADVANCED_YEARLY   = price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY= price_...
STRIPE_PRICE_ENTERPRISE_YEARLY = price_...
STRIPE_PRICE_CREDITS_50        = price_...
STRIPE_PRICE_CREDITS_200       = price_...
STRIPE_PRICE_CREDITS_500       = price_...
```

### Flag demo (opzionali)
```
DEV_DEFAULT_PLAN       = pro       # solo per ambienti non-prod
NEXT_PUBLIC_DEMO_PLAN  = pro       # solo per ambienti non-prod
```

> **Sicurezza:** non committare mai questi valori nel repo. `STRIPE_SECRET_KEY` deve essere
> la chiave **live** (`sk_live_`) in produzione, non `sk_test_`.

---

## Sezione 5 — Setup Stripe (produzione)

1. **Attiva l'account** (toggle da Test mode → Live mode dopo aver completato l'onboarding business).
2. **Crea i prodotti** (Products → Add product) per ogni piano:
   - Pro (mensile + annuale)
   - Advanced (mensile + annuale)
   - Enterprise (mensile + annuale)
   - Pacchetti crediti (50 / 200 / 500)
3. Per ogni prezzo, copia il `price_...` ID nelle corrispondenti env vars (Sezione 4).
4. **Webhook:** Developers → Webhooks → Add endpoint:
   - URL: `https://anlyra.it/api/webhooks/stripe`
   - Eventi: almeno `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copia il **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`
5. **Tax (opzionale):** abilita Stripe Tax se servono IVA automatica per clienti UE.

Test locale dei webhook:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Sezione 6 — Setup Resend (verifica dominio)

1. Resend → Domains → Add Domain → `anlyra.it`.
2. Resend genera record DNS da aggiungere su GoDaddy:
   - **SPF** (TXT): `v=spf1 include:resend.com ~all`
   - **DKIM** (CNAME, 3 record): forniti da Resend
   - **DMARC** (TXT, raccomandato): `v=DMARC1; p=none; rua=mailto:dmarc@anlyra.it`
3. Aggiungi i record su GoDaddy (vedi Sezione 7), poi clicca **Verify** su Resend.
4. La verifica può richiedere fino a 48h per la propagazione DNS (di solito pochi minuti).
5. `RESEND_FROM` deve usare un indirizzo sul dominio verificato (es. `noreply@anlyra.it`).

> Verifica la deliverability con [mail-tester.com](https://www.mail-tester.com) prima del launch.

---

## Sezione 7 — DNS GoDaddy → Vercel

In Vercel → Settings → Domains → aggiungi `anlyra.it` e `www.anlyra.it`. Vercel indica i record da configurare.

Su **GoDaddy → DNS Management** per `anlyra.it`:

| Tipo | Nome | Valore | Note |
|---|---|---|---|
| `A` | `@` | `76.76.21.21` | Apex → Vercel |
| `CNAME` | `www` | `cname.vercel-dns.com` | Sottodominio www |
| `TXT` | `@` | `v=spf1 include:resend.com ~all` | SPF email |
| `CNAME` | (Resend DKIM ×3) | (valori Resend) | DKIM email |
| `TXT` | `_dmarc` | `v=DMARC1; p=none; ...` | DMARC |

> I valori `A`/`CNAME` per Vercel possono variare — usa sempre quelli mostrati nel pannello
> Vercel Domains, non valori hardcoded.

Dopo la propagazione, Vercel emette automaticamente il certificato SSL (Let's Encrypt).

---

## Sezione 8 — Smoke test

Dopo il deploy in produzione, verifica:

### URL e SEO
- [ ] `https://anlyra.it` → landing IT carica
- [ ] `https://anlyra.it/en` → landing EN carica
- [ ] `https://anlyra.it/robots.txt` → output corretto
- [ ] `https://anlyra.it/sitemap.xml` → 12 entries
- [ ] `https://anlyra.it/opengraph-image.png` → immagine generata

### Funzionale
- [ ] Signup nuovo utente → cookie `pro_session` settato
- [ ] Login / logout (logout via `/api/auth/logout`)
- [ ] Dashboard overview carica dati reali da Postgres
- [ ] Import dati (batch) funziona
- [ ] Pagina pricing mostra prezzi corretti

### API e integrazioni
- [ ] Checkout Stripe → redirect e pagamento test
- [ ] Webhook Stripe riceve `invoice.paid` (verifica nei log Stripe → 200)
- [ ] Email di conferma pagamento arriva
- [ ] Insight AI generato (verifica chiamata Anthropic)

### Performance
- [ ] Lighthouse / PageSpeed Insights su landing — Core Web Vitals verdi
- [ ] Mobile-friendly test passa

---

## Sezione 9 — Rollback

### Rapido (<5 min) — problema nel deploy corrente
Vercel → Deployments → seleziona il deploy precedente funzionante → **Promote to Production**.
Nessuna modifica DB necessaria.

### Medio (<1 ora) — regressione applicativa
1. `git revert <commit>` del cambiamento problematico
2. Push → Vercel auto-deploy
3. Verifica smoke test essenziali

### Completo (<24 ore) — problema dati/schema
Segui la procedura di rollback DB in `docs/postgres-migration-plan.md` §5 (export dati
post-deploy, ripristino backup Supabase point-in-time, re-deploy).

---

## Sezione 10 — Monitoring

| Strumento | Uso | Setup |
|---|---|---|
| **Vercel Analytics** | Web vitals, traffico | Abilita in Vercel → Analytics |
| **Sentry** | Error tracking | `@sentry/nextjs`, DSN in env |
| **Better Stack** | Uptime monitoring | Heartbeat su `https://anlyra.it` |
| **Supabase Logs** | Query lente, errori DB | Dashboard Supabase → Logs |
| **Stripe Dashboard** | Pagamenti, dispute, MRR | Notifiche email |
| **Resend Logs** | Bounce, complaint, delivery | Dashboard Resend |

Configura alert per: error rate > soglia (Sentry), downtime (Better Stack), pagamenti falliti (Stripe).

---

## Sezione 11 — Checklist finale go-live

### Tecnica
- [ ] `npx tsc --noEmit` pulito in locale
- [ ] `npm run build` pulito in locale
- [ ] Migration Postgres applicate (`prisma migrate deploy`)
- [ ] Tutte le env vars production settate in Vercel
- [ ] SSL attivo su `anlyra.it` e `www.anlyra.it`
- [ ] Webhook Stripe verificato (test event → 200)
- [ ] Dominio email Resend verificato (SPF/DKIM/DMARC green)

### Business
- [ ] Prezzi Stripe live corrispondono al pricing pubblicato
- [ ] Pagine legali aggiornate (privacy, terms, cookies)
- [ ] Stripe Tax configurato (se applicabile)

### Marketing
- [ ] Google Search Console: proprietà verificata + sitemap submittata
- [ ] OG preview testata (opengraph.xyz, Twitter validator, LinkedIn)
- [ ] Favicon e apple-icon presenti

### Post-launch
- [ ] Monitoring attivo (Sentry, uptime, Vercel Analytics)
- [ ] Backup DB verificato funzionante
- [ ] Test transazione reale (piccolo importo, poi refund)
- [ ] Piano di rollback rivisto col team

---

## Appendice A: Architettura

```
                       ┌─────────────────┐
        Utente ───────▶│   Vercel Edge   │  (Next.js 14 App Router)
                       │   region: fra1  │
                       └────────┬────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                    ▼
   ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐
   │ Supabase       │  │ Stripe         │  │ Anthropic API    │
   │ Postgres (EU)  │  │ Payments +     │  │ Claude (insights)│
   │ pooler :6543   │  │ Webhooks       │  └──────────────────┘
   │ direct  :5432  │  └────────────────┘
   └────────────────┘           │
                                │ webhook → /api/webhooks/stripe
                                ▼
                       ┌────────────────┐
                       │ Resend         │
                       │ Email (EU)     │
                       └────────────────┘

   Auth: cookie custom `pro_session` (no NextAuth)
   DNS:  GoDaddy → Vercel (A/CNAME) + Resend (SPF/DKIM/DMARC)
```

---

## Appendice B: Costi mensili stimati

### Fase 0 (0-20 utenti, primo mese)
- Vercel Free: €0
- Supabase Free: €0
- Resend Free (3K emails): €0
- Stripe: 1.4% + €0.25 per transazione, no fee fissa
- Dominio: €0 (già acquistato)
- **TOTALE**: €0 + commissioni Stripe variabili

### Fase 1 (20-100 utenti, post-traction)
- Vercel Pro: $20/mo (~€19)
- Supabase Pro: $25/mo (~€23) — backup point-in-time
- Resend Pro $20/mo (~€19) — 50K emails
- Sentry Team: $26/mo (~€24)
- Better Stack Free: €0
- **TOTALE**: ~€85/mese fisso + commissioni Stripe

### Fase 2 (100-500 utenti)
- Vercel Pro + bandwidth overage: ~€30
- Supabase Pro + compute upgrade: ~€50
- Resend: ~€50
- Sentry Business: ~€80
- **TOTALE**: ~€210/mese

---

## Appendice C: Troubleshooting comuni

### Deploy Vercel fallisce su build
- Verifica `npx tsc --noEmit` pulito in locale
- Verifica `npm run build` pulito in locale
- Controlla log Vercel per modulo mancante

### Database connection error in production
- Verifica `DATABASE_URL` punta a pooler (6543), NON direct (5432)
- Verifica password URL-encoded
- Verifica region Supabase non-blocked da Vercel region

### Stripe webhook 400
- Verifica `STRIPE_WEBHOOK_SECRET` corrisponde a quello dell'endpoint specifico
- Test localmente con `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Email non arrivano
- Verifica DKIM/SPF in spam check (mail-tester.com)
- Verifica `RESEND_API_KEY` valido
- Controlla Resend dashboard logs per errori bounce/complain

---

**Documento creato**: 2026-05-24
**Ultima revisione**: 2026-05-24
**Autore**: Anlyra team + Claude
**Status**: Ready for execution
