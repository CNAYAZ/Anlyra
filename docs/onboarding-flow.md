# Onboarding Flow — Blueprint FASE D

**Versione:** 1.0
**Data:** 2026-05-24
**Status:** Blueprint pronto per implementazione FASE D — Living document
**Stima sviluppo:** 3-4 settimane full-time (4 sprint)

> Questo documento descrive il flusso completo di onboarding utente Anlyra,
> dalla prima visita al primo insight generato. Serve da specifica di riferimento
> per il team di sviluppo durante la FASE D.

---

## 1. Visione macro

### 1.1 Obiettivo
Portare un nuovo utente da "mai sentito Anlyra" a "ho visto il mio primo insight AI" in
**meno di 6 minuti** (TTV target). Ogni step deve essere così semplice che l'utente
preferisce completarlo subito piuttosto che uscire.

### 1.2 Funnel overview

```
Landing page
    │
    ▼
/[locale]/signup          ← FASE D (da costruire)
    │
    ▼
Email verify              ← FASE D
    │
    ▼
/[locale]/welcome         ← FASE D
    │
    ▼
/[locale]/onboarding/*    ← FASE D (5-step wizard)
    │
    ▼
/[locale]/ai/insights     ← ✅ esiste, manca solo tour overlay
```

### 1.3 Stato implementazione corrente
- ✅ Dashboard completa (`/[locale]/ai/insights`, finance, market, ecc.)
- ✅ Email infrastructure (Resend + 5 template: welcome, verify-email, password-reset, team-invite, payment-confirmed)
- ✅ Auth via cookie custom `pro_session` (demo mode)
- ❌ Signup/login reali (solo demo, nessun email/password)
- ❌ Email verification flow
- ❌ Onboarding wizard
- ❌ Trial management
- ❌ Team invite UI
- ❌ Tour overlay

### 1.4 KPI target onboarding

| Metrica | Target | Note |
|---|---|---|
| Activation rate | ≥ 80% | Signup → email verified |
| TTV mediana | ≤ 6 min | Signup → first insight |
| Drop-off per step | ≤ 20% | Alert se sopra soglia |
| Trial → paid | 8-15% | Benchmark B2B SaaS |

---

## 2. Step-by-step flow

### Step 1 — Signup

**Pagina**: `/[locale]/signup`
**Status**: ❌ da costruire (attualmente esiste solo demo login)

#### Layout mockup

```
┌─────────────────────────────────────────────┐
│  [A] Anlyra          Hai già un account? Accedi│
├─────────────────────────────────────────────┤
│                                             │
│   Inizia gratis                             │
│   Nessuna carta richiesta. 7 giorni di prova│
│                                             │
│   [G] Continua con Google                  │
│   [M] Continua con Microsoft               │
│                                             │
│   ─────────── oppure ───────────           │
│                                             │
│   Nome completo *                           │
│   [__________________________]              │
│                                             │
│   Email aziendale *                         │
│   [__________________________]              │
│                                             │
│   Password * (min 8 caratteri)              │
│   [__________________________] [👁]          │
│                                             │
│   [  Crea account →  ]                      │
│                                             │
│   Registrandoti accetti i Termini e la      │
│   Privacy Policy di Anlyra                  │
└─────────────────────────────────────────────┘
```

#### Validation rules
- Nome: min 2 caratteri, max 60
- Email: formato valido, dominio non blocklist (es. mailinator, tempmail)
- Password: min 8 caratteri, almeno 1 numero o simbolo
- hCaptcha invisibile su submit per anti-bot (dopo traction)

#### Post-submit
1. Crea User in DB (passwordHash con bcrypt cost 12)
2. Genera `emailVerifyToken` (cuid)
3. Invia email `verify-email` via Resend (template già esistente)
4. Redirect a `/[locale]/check-email?email=xxx@yyy.com`

#### Pagina `/check-email`
```
┌─────────────────────────────────────────────┐
│                                             │
│          📧                                 │
│   Controlla la tua email                    │
│                                             │
│   Abbiamo inviato un link di conferma a     │
│   xxx@yyy.com                               │
│                                             │
│   Il link scade tra 24 ore.                 │
│                                             │
│   [Non hai ricevuto? Reinvia]               │
│   [Cambia email]                            │
│                                             │
└─────────────────────────────────────────────┘
```

---

### Step 2 — Email verification

**Pagina**: `/[locale]/verify-email?token=xxxx`
**Status**: ❌ da costruire

#### Flow
1. Utente clicca link email → `/[locale]/verify-email?token=xxxx`
2. Server verifica token (esiste, non scaduto, non già usato)
3. Marca `emailVerifiedAt = now()` sul User
4. Invalida token
5. Invia email `welcome` via Resend (template già esistente)
6. Crea session cookie `pro_session`
7. Redirect → `/[locale]/welcome`

#### Error states
- Token non trovato → "Link non valido. Richiedi un nuovo link."
- Token scaduto (>24h) → "Link scaduto." + [Richiedi nuovo link]
- Email già verificata → redirect a `/[locale]/overview` direttamente

---

### Step 3 — Welcome screen

**Pagina**: `/[locale]/welcome`
**Status**: ❌ da costruire

#### Layout mockup

```
┌─────────────────────────────────────────────┐
│                                             │
│          [A] Anlyra                         │
│                                             │
│   Benvenuto/a in Anlyra, [Nome] 👋           │
│                                             │
│   In 3 minuti ti aiutiamo a configurare     │
│   la tua dashboard personale.               │
│                                             │
│   Cosa ti aspetti da Anlyra?                │
│                                             │
│   ┌──────────────────────────────────────┐  │
│   │ 📊  Monitorare KPI e cashflow        │  │
│   └──────────────────────────────────────┘  │
│   ┌──────────────────────────────────────┐  │
│   │ 🤖  Ricevere insights AI automatici  │  │
│   └──────────────────────────────────────┘  │
│   ┌──────────────────────────────────────┐  │
│   │ 📈  Fare forecasting finanziario     │  │
│   └──────────────────────────────────────┘  │
│   ┌──────────────────────────────────────┐  │
│   │ 👥  Collaborare con il mio team      │  │
│   └──────────────────────────────────────┘  │
│                                             │
│   [  Inizia la configurazione →  ]          │
│                                             │
└─────────────────────────────────────────────┘
```

#### Funzione
- Risposta salvata su Organization (campo futuro `primaryGoal`)
- Non bloccante: anche senza risposta si procede
- Serve per personalizzare home dashboard (future feature) e per analytics

---

### Step 4 — Org setup wizard

**Pagina**: `/[locale]/onboarding/[step]`
**Status**: ❌ da costruire
**Steps**: 5 — navigazione laterale + progress indicator

#### Step 4a — Info azienda

```
┌─────────────────────────────────────────────┐
│  ① Info azienda  ② Piano  ③ Dati  ④ Team  ⑤│
│  ●────────────────────────────────────────  │
├─────────────────────────────────────────────┤
│                                             │
│   Raccontaci della tua azienda              │
│                                             │
│   Nome azienda *                            │
│   [____________________________________]    │
│                                             │
│   Settore *                                 │
│   [▼ Seleziona settore               ]      │
│   (Retail, Manifatturiero, Servizi,         │
│    Tecnologia, E-commerce, Altro...)        │
│                                             │
│   Dimensione team *                         │
│   ● Solo io   ○ 2-5   ○ 6-15   ○ 16-50  ○ 50+│
│                                             │
│   P.IVA (opzionale)                         │
│   [____________________________________]    │
│                                             │
│                [Avanti →]                   │
└─────────────────────────────────────────────┘
```

#### Step 4b — Scegli piano

```
┌─────────────────────────────────────────────┐
│  ① Info  ② Piano  ③ Dati  ④ Team  ⑤        │
│  ●────●───────────────────────────────────  │
├─────────────────────────────────────────────┤
│                                             │
│   Scegli il tuo piano                       │
│   Prova gratuita 7 giorni · Nessuna carta   │
│                                             │
│   ┌──────────────┐  ┌──────────────────┐   │
│   │  Pro          │  │ ★ Avanzato        │   │
│   │  €49/mese     │  │  €149/mese        │   │
│   │               │  │  Più popolare     │   │
│   │  ✓ 200 crediti│  │  ✓ 700 crediti    │   │
│   │  ✓ 5 utenti   │  │  ✓ 15 utenti      │   │
│   │  ✓ 24 mesi    │  │  ✓ 36 mesi        │   │
│   │               │  │  ✓ Benchmark      │   │
│   │  [Scegli Pro] │  │  [Scegli Avanzato]│   │
│   └──────────────┘  └──────────────────┘   │
│                                             │
│   Oppure: [Confronta tutti i piani →]       │
│                                             │
└─────────────────────────────────────────────┘
```

Note: carta non richiesta in questo step. Trial attivato al submit. Redirect
a Stripe Checkout solo se utente vuole pagare subito.

#### Step 4c — Carica dati

```
┌─────────────────────────────────────────────┐
│  ① Info  ② Piano  ③ Dati  ④ Team  ⑤        │
│  ●────●────●──────────────────────────────  │
├─────────────────────────────────────────────┤
│                                             │
│   Porta i tuoi dati su Anlyra               │
│                                             │
│   ┌──────────────────────────────────────┐  │
│   │  📂  Trascina un CSV qui             │  │
│   │     oppure                           │  │
│   │  [  Sfoglia file  ]                  │  │
│   │                                      │  │
│   │  Formati: CSV, Excel (.xlsx)         │  │
│   │  Max: 10 MB per file                 │  │
│   └──────────────────────────────────────┘  │
│                                             │
│   ─── oppure ───                            │
│                                             │
│   [🧪 Usa dati demo — Inizia subito]         │
│                                             │
│   Non hai dati ora? [Salta, configuro dopo] │
│                                             │
└─────────────────────────────────────────────┘
```

**Background task al submit**: il server avvia la generazione del primo insight
(`generateInsight()`) in background. Tempo target < 5 secondi.

#### Step 4d — Invita team

```
┌─────────────────────────────────────────────┐
│  ① Info  ② Piano  ③ Dati  ④ Team  ⑤        │
│  ●────●────●────●─────────────────────────  │
├─────────────────────────────────────────────┤
│                                             │
│   Aggiungi i tuoi colleghi                  │
│                                             │
│   Email collega      Ruolo                  │
│   [________________] [▼ Editor  ] [+Aggiungi]│
│                                             │
│   (Lista degli invite in coda)              │
│   mario@esempio.it — Editor        [✕]      │
│                                             │
│   [  Invia inviti  ]                        │
│                                             │
│   [Salta per ora — sono solo io]            │
│                                             │
└─────────────────────────────────────────────┘
```

Ruoli disponibili: `admin`, `editor`, `viewer`.
Al submit: crea record `Invite`, invia email `team-invite` per ogni destinatario.

#### Step 4e — Tutto pronto

```
┌─────────────────────────────────────────────┐
│  ① Info  ② Piano  ③ Dati  ④ Team  ⑤        │
│  ●────●────●────●────●──────────────────── │
├─────────────────────────────────────────────┤
│                                             │
│          ✓                                  │
│   Anlyra è pronto per te!                   │
│                                             │
│   Riepilogo:                                │
│   ✓ Azienda: [Nome azienda]                 │
│   ✓ Piano: Pro · Trial fino al [data]       │
│   ✓ Dati: importati (o demo attivi)         │
│   ✓ Team: 2 inviti inviati                  │
│                                             │
│   Stiamo generando il tuo primo insight...  │
│   [████████░░] 80%                          │
│                                             │
│   (Auto-redirect tra 3 secondi)             │
│                                             │
└─────────────────────────────────────────────┘
```

Auto-redirect → `/[locale]/ai/insights` con query param `?highlight=first-insight`
una volta che il background task è completato (o dopo timeout 5s con fallback).

---

### Step 5 — Primo insight (a-ha moment)

**Pagina**: `/[locale]/ai/insights` (con tour overlay per primo accesso)
**Status**: ✅ pagina esistente, manca solo onboarding overlay

#### Tour overlay (primo accesso)
- Spotlight su primo Insight Card
- Tooltip: "Ecco il tuo primo insight. Anlyra analizza i tuoi dati e ti dice cosa fare."
- CTA: "Cliccalo per vedere i dettagli"
- Steps successivi (skippable): mostra Alert (sidebar), Forecasting, Settings

Software consigliato per tour: **driver.js** (gratis, lightweight, 5KB)
- Install: `npm install driver.js`
- Setup in Client Component condizionale (solo se `user.onboardingCompletedAt === null`)

---

## 3. Email touch points

Sequenza email durante onboarding:

| Trigger | Template | Subject | Quando inviata |
|---------|----------|---------|----------------|
| Signup completato | `verify-email` | "Conferma il tuo indirizzo email · Anlyra" | Immediato post-form submit |
| Email verificata | `welcome` | "Benvenuto in Anlyra, [Nome]" | Immediato post-verify |
| Org setup completato | — (già loggato) | — | — |
| Team invite inviato | `team-invite` | "[Nome] ti ha invitato a unirti ad Anlyra" | Subito (al destinatario) |
| Trial 3 giorni residui | `trial-3days` ⚠️ | "3 giorni alla scadenza · Anlyra" | Trial day 4 |
| Trial 1 giorno residuo | `trial-1day` ⚠️ | "Domani scade la prova · Anlyra" | Trial day 6 |
| Trial scaduto | `trial-expired` ⚠️ | "Prova scaduta — riattiva il tuo account" | Trial day 8 |
| Pagamento riuscito | `payment-confirmed` | "Pagamento confermato · Anlyra" | Webhook Stripe `invoice.paid` |
| Cancellazione | `subscription-canceled` ⚠️ | "Account cancellato — torna quando vuoi" | Stripe webhook `subscription.deleted` |

> ⚠️ = template **da creare** in FASE D. Gli altri 5 esistono già in
> `src/lib/email/templates/`.

Template da creare: `trial-3days`, `trial-1day`, `trial-expired`, `subscription-canceled`.

---

## 4. Edge cases globali

### 4.1 OAuth signup
- Google/Microsoft restituiscono email + nome → form pre-compilato, password skip
- Se email già esistente con password locale → "Account esistente. Vuoi collegare Google?"
- Se cancella OAuth dialog → torna a signup form pulito

### 4.2 Refresh durante onboarding
- Step state persistito in cookie + DB (`onboardingStep` field su User)
- Refresh = riprende dallo step corrente

### 4.3 Abbandono onboarding
- Cookie session valida 7 giorni (anche se non completato setup)
- Login successivo → redirect automatico allo step incompleto
- Email "Hai abbandonato il setup" dopo 24h (NUOVO template da creare)

### 4.4 Tablet/mobile
- Mobile-first design per signup form (max 1 colonna)
- Org setup wizard: stack verticale su mobile
- Tour overlay driver.js: responsive (auto-adapt)

### 4.5 Accessibility
- Form fields con label visibili (no placeholder-only)
- Focus order tab logico
- Screen reader: aria-label su icon buttons
- Color contrast WCAG AA su tutti i CTA
- No animazioni distraenti se `prefers-reduced-motion`

---

## 5. Schema dati richieste per FASE D

> ⚠️ Queste sono modifiche Prisma da applicare — NON ancora nel codice.
> Seguire la procedura normale: edit schema → `prisma migrate dev` → deploy.

### 5.1 User model — aggiungere

Modello corrente ha: `id`, `email`, `name`, `image`, `locale`, `createdAt`, `memberships`.

Campi da aggiungere:

```prisma
model User {
  // ... campi esistenti (non toccare)
  emailVerifiedAt        DateTime?
  passwordHash           String?       // null se solo OAuth
  onboardingStep         String?       // 'org-info' | 'plan' | 'data' | 'team' | 'completed'
  onboardingCompletedAt  DateTime?
  trialEndsAt            DateTime?
  emailVerifyToken       String?       @unique
  passwordResetToken     String?       @unique
  passwordResetExpiresAt DateTime?
  twoFactorSecret        String?
  twoFactorEnabledAt     DateTime?
}
```

### 5.2 Organization model — verificare/aggiungere

Modello corrente ha già: `industry String @default("Generale")`, `employees Int`.

Campi da aggiungere o verificare:

```prisma
model Organization {
  // ... campi esistenti (non toccare)
  // industry: già presente come String — convertire in nullable? valutare
  teamSize         String?       // '1' | '2-5' | '6-15' | '16-50' | '50+'
  vatNumber        String?       // P.IVA opzionale
  setupCompletedAt DateTime?
}
```

> `industry` esiste già come `String @default("Generale")` — potrebbe essere
> sufficiente. `employees` esiste già come `Int` — valutare se tenerlo o sostituire
> con `teamSize String?` per compatibilità con le stringhe del wizard.

### 5.3 Invite model — nuovo

```prisma
model Invite {
  id              String    @id @default(cuid())
  email           String
  organizationId  String
  invitedById     String
  role            String    // 'admin' | 'editor' | 'viewer'
  token           String    @unique
  acceptedAt      DateTime?
  expiresAt       DateTime
  createdAt       DateTime  @default(now())
  organization    Organization @relation(fields: [organizationId], references: [id])
  invitedBy       User         @relation(fields: [invitedById], references: [id])
}
```

---

## 6. Metriche da tracciare

### 6.1 Funnel analytics
Tracciare ogni step con event analytics (PostHog o Mixpanel):

- `signup_form_viewed`
- `signup_form_submitted`
- `email_verified`
- `welcome_screen_viewed`
- `org_setup_started`
- `org_setup_step_completed` (con property `step: 'org-info' | 'plan' | 'data' | 'team'`)
- `org_setup_completed`
- `first_insight_viewed`
- `onboarding_tour_started`
- `onboarding_tour_skipped`
- `onboarding_tour_completed`

### 6.2 KPI target

- **Activation rate**: signup → email verified ≥ 80%
- **TTV (time to value)**: signup → first insight ≤ 6 minuti mediana
- **Drop-off rate per step**: max 20% per step (alert se sopra)
- **Trial → paid conversion**: target 8-15% (industry benchmark B2B SaaS)

### 6.3 Dashboards interne
Creare dashboard PostHog/Mixpanel con:
- Conversion funnel signup → first insight
- Drop-off heatmap per step
- TTV histogram
- Cohort retention (D1, D7, D30)

---

## 7. Implementation checklist FASE D

Sequenza implementativa raccomandata:

### Sprint 1 (1 settimana) — Auth foundation
- [ ] NextAuth v5 setup base
- [ ] Provider: Email/password + Google + Microsoft
- [ ] Schema Prisma aggiornato (campi User + Organization + Invite)
- [ ] Migration applicata
- [ ] Signup form `/[locale]/signup` (UI + validation)
- [ ] Login form `/[locale]/login` (refactor su NextAuth)
- [ ] Logout NextAuth (sostituire cookie demo `pro_session`)

### Sprint 2 (1 settimana) — Onboarding wizard
- [ ] Email verify flow (page `/[locale]/verify-email` + API + email send)
- [ ] Password reset flow (request + reset pages + email send)
- [ ] Welcome page `/[locale]/welcome`
- [ ] Org setup wizard 5 steps `/[locale]/onboarding/[step]`
- [ ] Demo data populate option (pulsante "Usa dati demo")

### Sprint 3 (3-5 giorni) — Social features
- [ ] Team invite flow (form + API + email + accept page)
- [ ] First insight tour overlay (driver.js)
- [ ] 2FA TOTP via `speakeasy` (opt-in da settings)

### Sprint 4 (3-5 giorni) — Trial + polish
- [ ] Trial email sequence (4 nuovi template Resend)
- [ ] Trial expiry handling (gate in middleware/server actions)
- [ ] Onboarding analytics events (PostHog)
- [ ] Edge cases (refresh, abandon, OAuth conflicts)
- [ ] Testing E2E con Playwright

**Totale stima:** 3-4 settimane di sviluppo full-time.

---

## 8. Riferimenti

- NextAuth v5 docs: https://authjs.dev
- driver.js (tour overlay): https://driverjs.com
- hCaptcha invisibile: https://hcaptcha.com
- PostHog (analytics): https://posthog.com
- Email best practice B2B SaaS: https://reallygoodemails.com/welcome

---

**Documento creato:** 2026-05-24
**Ultima revisione:** 2026-05-24
**Autore:** Anlyra team + Claude
**Status:** Blueprint pronto per implementazione FASE D. Living document —
aggiornare durante sviluppo con learnings reali.
