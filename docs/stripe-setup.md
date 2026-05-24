---
title: Anlyra · Stripe Production Setup
version: 1.0
target: Stripe Dashboard production (live mode)
status: ready for execution at launch
---

# Anlyra · Stripe Production Setup Guide

> Guida step-by-step per configurare Stripe production al lancio commerciale Anlyra.
>
> **Quando eseguire questa guida**: il giorno (o pochi giorni prima) del go-live commerciale.
> **Prima**: usa Stripe test mode con test keys per sviluppo.
> **Tempo stimato**: 2-3 ore (creazione prodotti + tax + webhook + test).

## Indice
1. Prerequisiti account Stripe
2. Tax settings (IVA italiana, EU B2B)
3. Creazione products + price IDs
4. Webhook endpoint
5. Customer Portal
6. Email + receipts settings
7. Test mode → Live mode transition
8. Smoke test post-live
9. Monitoring + alerts

## 1. Prerequisiti account Stripe

### 1.1 Account business attivato
- [ ] Account Stripe con verifica completata
- [ ] Dati fiscali italiani inseriti (Partita IVA o Codice Fiscale ditta individuale)
- [ ] Bank account verificato per payouts (IBAN italiano)
- [ ] Tax ID verificato (P.IVA con VIES se vuoi vendere B2B EU)
- [ ] Identity verification completata (KYC)

### 1.2 Modalità da abilitare
- Subscriptions (per Pro + Avanzato ricorrenti)
- One-time payments (per credit packs)
- Tax (Stripe Tax automatico)
- Customer Portal (gestione self-service del cliente)

## 2. Tax settings — IVA italiana + EU

### 2.1 Abilita Stripe Tax
Stripe Dashboard → **Tax → Get started**:
1. Tax origin: **Italia** (sede legale dell'azienda)
2. Default tax behavior: **Inclusive** o **Exclusive** (decidi: prezzi sui piani includono IVA o aggiungo?)
   - Raccomandato: **Exclusive** (mostra prezzo netto + IVA separata, più trasparente B2B)
3. Pricing display: **Same prices everywhere** o **Auto adjust by location**
   - Raccomandato: stesso prezzo (semplifica messaggistica)

### 2.2 Tax ID validation
- Abilita raccolta P.IVA cliente al checkout (per fatture B2B EU reverse charge)
- VIES validation: ON (verifica P.IVA real-time, scarica IVA se P.IVA valida e cliente fuori IT)

### 2.3 Aliquote attese (auto-calcolate da Stripe Tax)
- Italia (B2B + B2C): 22%
- EU B2B con VIES verificato: 0% (reverse charge)
- EU B2C: aliquota destinazione (es. Germania 19%, Francia 20%)
- Fuori EU: 0% (export)

### 2.4 Receipts e fatture
- Stripe Tax genera ricevute automatiche
- Per fatturazione elettronica italiana SDI: serve integrazione separata (es. Fatture in Cloud, Aruba) — vedi appendice B

## 3. Creazione products + price IDs

> **Nota:** i nomi delle env var qui sotto corrispondono esattamente a quelli letti dal
> codice in `src/lib/stripe/prices.ts`. Non rinominarli.

### 3.1 Product: Anlyra Pro

Stripe Dashboard → Products → Add product:
- Name: `Anlyra Pro`
- Description: `Analytics AI per piccoli team. 200 crediti AI/mese, fino a 5 utenti, 24 mesi storia dati.`
- Image: logo Anlyra (sage) — upload PNG 1024x1024
- Tax behavior: **Exclusive** (o Inclusive secondo §2.1)
- Tax code: `txcd_10103001` (SaaS - Cloud Software Service)

**Prezzo mensile**:
- Pricing model: Standard pricing
- Price: `€49.00 EUR`
- Billing period: Monthly (every 1 month)
- Trial: 7 giorni (raccomandato, anti-abuse con carta richiesta)
- Save → **copia price_id**: `price_xxxxxxxxxxxxx` → variabile env `STRIPE_PRICE_PRO_MONTHLY`

**Prezzo annuale**:
- Add another price (stesso product Pro)
- Price: `€490.00 EUR`
- Billing period: Yearly (every 1 year)
- Trial: 7 giorni
- Save → **copia price_id** → variabile env `STRIPE_PRICE_PRO_YEARLY`

### 3.2 Product: Anlyra Avanzato

Stesso processo, dati:
- Name: `Anlyra Avanzato`
- Description: `Analytics AI per team in crescita. 700 crediti AI/mese, fino a 15 utenti, 36 mesi storia, benchmark settore, API read-only.`
- Tax code: `txcd_10103001`

**Mensile**:
- Price: `€149.00 EUR`
- Period: Monthly
- → `STRIPE_PRICE_ADVANCED_MONTHLY`

**Annuale**:
- Price: `€1490.00 EUR`
- Period: Yearly
- → `STRIPE_PRICE_ADVANCED_YEARLY`

### 3.3 Product: Anlyra Enterprise

- Name: `Anlyra Enterprise`
- Description: `Custom pricing. Utenti illimitati, SSO SAML, audit log, SLA 99%, DPA personalizzato. Contact sales.`
- Pricing pubblico opzionale: il codice prevede comunque `STRIPE_PRICE_ENTERPRISE_MONTHLY` /
  `STRIPE_PRICE_ENTERPRISE_YEARLY` (vedi `src/lib/stripe/prices.ts`). Se vendi Enterprise
  solo via fatturazione custom, lascia queste due env var vuote — il codice ritorna `null`
  e nessun checkout self-service viene generato per Enterprise.

### 3.4 Credit packs (one-time payments)

Per acquisto crediti AI aggiuntivi senza upgrade piano. Gli ID dei pack nel codice sono
`credits_50`, `credits_200`, `credits_500` (vedi `getCreditPackPriceId`).

**Pack 50 crediti**:
- New product → `Anlyra Crediti AI · 50`
- Price: `€19.00 EUR`, One-time
- → `STRIPE_PRICE_CREDITS_50`

**Pack 200 crediti**:
- New product → `Anlyra Crediti AI · 200`
- Price: `€59.00 EUR`, One-time
- → `STRIPE_PRICE_CREDITS_200`

**Pack 500 crediti**:
- New product → `Anlyra Crediti AI · 500`
- Price: `€129.00 EUR`, One-time
- → `STRIPE_PRICE_CREDITS_500`

### 3.5 Tabella riassuntiva price IDs

Compila questa tabella man mano che crei i prodotti:

| Product | Period | Price | Env var | Price ID |
|---------|--------|-------|---------|----------|
| Pro | Monthly | €49 | STRIPE_PRICE_PRO_MONTHLY | price_... |
| Pro | Yearly | €490 | STRIPE_PRICE_PRO_YEARLY | price_... |
| Avanzato | Monthly | €149 | STRIPE_PRICE_ADVANCED_MONTHLY | price_... |
| Avanzato | Yearly | €1490 | STRIPE_PRICE_ADVANCED_YEARLY | price_... |
| Enterprise | Monthly | custom | STRIPE_PRICE_ENTERPRISE_MONTHLY | price_... (opz.) |
| Enterprise | Yearly | custom | STRIPE_PRICE_ENTERPRISE_YEARLY | price_... (opz.) |
| Credits | 50 | €19 | STRIPE_PRICE_CREDITS_50 | price_... |
| Credits | 200 | €59 | STRIPE_PRICE_CREDITS_200 | price_... |
| Credits | 500 | €129 | STRIPE_PRICE_CREDITS_500 | price_... |

Poi inserisci tutti in Vercel Environment Variables (production).

## 4. Webhook endpoint

### 4.1 Crea endpoint webhook
Stripe Dashboard → **Developers → Webhooks → Add endpoint**:
- URL: `https://anlyra.it/api/webhooks/stripe`
- Description: `Anlyra production webhook`

**Eventi gestiti dal codice attuale** (`src/app/api/webhooks/stripe/route.ts`):
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

> Seleziona almeno questi 6 eventi. Puoi anche selezionarne altri (es.
> `customer.subscription.trial_will_end`, `checkout.session.expired`,
> `invoice.payment_action_required`, `payment_intent.payment_failed`): Stripe li
> invierà comunque, ma il handler attuale li ignora finché non aggiungi un `case`
> dedicato nello `switch (event.type)`. Aggiungere event non gestiti non causa errori —
> il default ritorna 200.

### 4.2 Recupera Signing Secret
Dopo creazione webhook → **Signing secret** → Reveal → copia
- Salva in Vercel: `STRIPE_WEBHOOK_SECRET = whsec_...`

### 4.3 Testing webhook
Locally con Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Stripe ti mostra un webhook secret di test → usa quello in .env.local
# Poi triggera eventi:
stripe trigger invoice.paid
stripe trigger customer.subscription.created
```

In produzione dopo deploy:
- Stripe Dashboard → Webhook endpoint → **Send test webhook**
- Verifica risposta 200 nel log

## 5. Customer Portal

Stripe Dashboard → **Settings → Billing → Customer portal**:

### 5.1 Configura
- **Branding**: logo Anlyra, color palette panna+sage, footer link a anlyra.it
- **Features enabled**:
  - Update payment method
  - View invoices
  - Cancel subscription (con motivo opzionale, raccomandato per analisi churn)
  - Pause subscription (opzionale, decide policy)
  - Update billing address
  - Update tax ID (P.IVA)

- **Cancellation policy**:
  - Cancellazione immediata vs fine periodo: **fine periodo** (cliente paga fino a quando ha già pagato)
  - Trattamento prorata: **No prorata** (no rimborso parziale)

### 5.2 Return URL post-portal
Il codice (`src/app/api/billing/portal/route.ts`) costruisce il return_url come
`${origin}/settings/billing` — quindi al dominio production diventa
`https://anlyra.it/settings/billing`. Non serve configurare un return URL fisso nel
Dashboard: viene passato dinamicamente alla creazione della sessione.

### 5.3 Generazione link portal
Implementazione già presente in `src/app/api/billing/portal/route.ts`:

```ts
const portal = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: `${origin}/settings/billing`,
});
```

## 6. Email + receipts settings

### 6.1 Stripe email automatici da disabilitare (perché li gestiamo noi via Resend)
Stripe Dashboard → **Settings → Emails**:
- Successful payments: **OFF** (Anlyra invia paymentConfirmedTemplate via Resend sull'evento `invoice.paid`)
- Failed payments: **OFF** (Anlyra gestisce `invoice.payment_failed`)
- Subscriptions canceled: **OFF**
- Refunds: **OFF**

### 6.2 Stripe email da TENERE
- Receipts on successful charge: **ON** (Stripe genera PDF ricevuta automatica, comodo per cliente)
- Dispute notifications: **ON** (devi gestire dispute con urgenza)

### 6.3 Branding emails
Anche se la maggior parte sarà OFF, configura branding per quelle attive:
- Logo: Anlyra logo
- Colore primario: `#5B6F4E` (sage-500)
- Statement descriptor: `ANLYRA SRL` (max 22 caratteri, appare su estratto conto cliente)

## 7. Test mode → Live mode transition

### 7.1 Checklist pre-switch
- [ ] Tutti i prodotti creati in test mode E in live mode (identici)
- [ ] Price IDs test salvati separatamente (per environments dev/staging)
- [ ] Price IDs live salvati (per production)
- [ ] Webhook endpoint test funzionante (status 200 sui test events)
- [ ] Webhook endpoint live creato (URL https://anlyra.it/api/webhooks/stripe)
- [ ] Tax settings configurati e attivati (Stripe Tax ON)
- [ ] Customer Portal configurato

### 7.2 Switch operativo
1. In Vercel: aggiorna env vars da `sk_test_` a `sk_live_`, da `pk_test_` a `pk_live_`
2. Aggiorna `STRIPE_WEBHOOK_SECRET` con il valore del webhook LIVE (non quello di test)
3. Redeploy Vercel
4. Smoke test: vedi sezione 8

### 7.3 Mantenere test mode parallel
- Tieni env vars test mode in branch `staging` su Vercel
- Permette QA continuo senza toccare produzione

## 8. Smoke test post-live

### 8.1 Test cards (anche in live mode con valori specifici Stripe-approved)
- [ ] Card di test Stripe: `4242 4242 4242 4242` (in test mode)
- [ ] In live mode: usa la tua carta vera per primo checkout reale
- [ ] Subito dopo: refunda da Stripe Dashboard per non lasciare addebito reale

### 8.2 Test flussi
- [ ] Checkout Pro mensile → riceve email payment-confirmed
- [ ] Checkout Pro annuale → email
- [ ] Upgrade Pro → Avanzato (via portal o checkout) → email
- [ ] Downgrade Avanzato → Pro → email
- [ ] Cancellazione subscription → email cancel confirmed
- [ ] Crediti pack acquisto → email + crediti aggiunti al balance utente
- [ ] Card declined: usa `4000 0000 0000 0002` (Stripe test card)

### 8.3 Test webhook responses
- [ ] I 6 eventi gestiti al §4.1 ritornano 200
- [ ] In log Vercel: nessun errore Stripe webhook
- [ ] In log applicazione: log "email sent" o "credit added" per ogni evento

## 9. Monitoring + alerts

### 9.1 Stripe Dashboard alerts
Stripe → Settings → Notifications:
- Email per dispute (urgente)
- Email per failed webhook (5xx response)
- Slack/Telegram integration (post-launch quando hai team)

### 9.2 Custom monitoring lato Anlyra
- Sentry catch errori in `/api/webhooks/stripe/route.ts`
- Vercel Analytics per webhook latency (deve essere <1s)
- Considerare: alert custom se webhook 4xx/5xx > 5% in 1 ora

### 9.3 Reporting mensile
- MRR (Monthly Recurring Revenue) dal Stripe Dashboard
- Churn rate (cancellation %)
- Upgrade rate (Pro → Avanzato)
- Average revenue per user (ARPU)

---

## Appendice A: Codici fiscali Stripe products

Per Italia/EU SaaS, codice fiscale corretto: `txcd_10103001` (Cloud Software Service).
Lista completa: https://stripe.com/docs/tax/tax-codes

## Appendice B: Fatturazione elettronica italiana (SDI)

Stripe NON gestisce fatturazione elettronica italiana via SDI (Sistema Di Interscambio). Per compliance:
- Opzione A (raccomandato): **Fatture in Cloud** API integration
  - Stripe webhook `invoice.paid` → call Fatture in Cloud API → genera fattura elettronica
  - Costo: ~€10/mese fino a 100 fatture
- Opzione B: **Aruba Fatturazione Elettronica**
  - Stessa logica, costo simile
- Opzione C: gestione manuale (commercialista riceve report mensile e genera fatture)
  - OK per primi 5-10 clienti, non scala

## Appendice C: Best practice anti-fraud

Anche con trial richiesto carta, possibili abuse:
- **Rate limit signup** per IP (max 3 trial accounts/IP/24h)
- **Fingerprinting**: Stripe Radar (gratuito) blocca pattern sospetti
- **Email verification obbligatoria** (quando si introdurrà l'autenticazione email/password)
- **Geolocation**: warning se cliente UE ma payment method extra-UE (potrebbe essere stolen card)

---

**Documento creato**: 2026-05-24
**Ultima revisione**: 2026-05-24
**Autore**: Anlyra team + Claude
**Status**: Ready for execution at commercial launch
