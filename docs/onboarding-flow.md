# Onboarding Flow — Blueprint FASE D

**Versione:** 2.0
**Last updated:** 2026-05-28
**Status:** FASE D **implementata** — questo documento è il blueprint di riferimento (specifica + stato).
**Audience:** dev / product.

> Descrive il flusso completo di onboarding Anlyra, dalla prima visita al primo insight AI. La FASE D
> (NextAuth v5, signup reale, email verify, 2FA, onboarding wizard, multi-org, invite) è **già
> implementata in codice**; questo documento resta la specifica di riferimento e traccia onestamente
> ciò che è completo vs ciò che è da rifinire (§7).

**Documenti correlati**: [`SECURITY.md`](SECURITY.md) (auth, password, 2FA), [`stripe-setup.md`](stripe-setup.md)
(trial & eventi pagamento), [`email/onboarding-sequence.md`](email/onboarding-sequence.md),
[`FAQ.md`](FAQ.md), [`i18n/translation-style-guide.md`](i18n/translation-style-guide.md) (copy).

---

## 1. Visione macro

### 1.1 Obiettivo

Portare un nuovo utente da "mai sentito Anlyra" a "ho visto il mio primo insight AI" in
**meno di 6 minuti** (Time-To-Value target). Ogni step deve essere così semplice che l'utente
preferisce completarlo subito piuttosto che abbandonare.

### 1.2 Funnel

```
   Landing page  (/[locale])
        │   CTA "Inizia la prova gratuita"
        ▼
   Signup        (/[locale]/signup)          ✅ FASE D
        │   email/password  oppure  Google / Microsoft
        ▼
   Verifica email (/[locale]/verify-email)   ✅ FASE D
        │   click sul link nell'email (token monouso)
        ▼
   Welcome       (/[locale]/welcome)         ✅ FASE D
        │   benvenuto + selezione goal (opzionale)
        ▼
   Org wizard    (/[locale]/onboarding/*)    ✅ FASE D (4 substep)
        │   info azienda → settore/dimensione → import (skip) → invite team
        ▼
   First insight (/[locale]/ai/insights)     ✅ esiste · 🚧 tour overlay da rifinire
```

### 1.3 KPI target del funnel

| Tappa | Metrica | Target |
|---|---|---|
| Landing → Signup start | CTR CTA | ≥ 8% |
| Signup start → complete | Completion | ≥ 75% |
| Signup → Email verified | Verify rate | ≥ 70% |
| Verified → Wizard complete | Wizard completion | ≥ 60% |
| Wizard → First insight | Activation (TTV < 6 min) | ≥ 50% |

---

## 2. Step-by-step flow

### Step 1 — Signup

Route: `/[locale]/signup`. Metodi: **email/password** o **OAuth Google / Microsoft**.

```
┌──────────────────────────────────────────────┐
│  Anlyra                                        │
│                                                │
│  Crea il tuo account                           │
│  Analytics e AI advisory per la tua impresa.   │
│                                                │
│  [  Continua con Google      ]                 │
│  [  Continua con Microsoft   ]                 │
│  ───────────  oppure  ───────────             │
│  Email     [____________________]             │
│  Password  [____________________]  👁          │
│  • min 12 caratteri • 1 maiuscola              │
│  • 1 numero • 1 carattere speciale             │
│                                                │
│  [        Crea account        ]                │
│                                                │
│  Hai già un account?  Accedi                   │
└──────────────────────────────────────────────┘
```

Copy chiave (IT, registro "tu"): *"Crea il tuo account"*, *"Continua con Google"*, *"Crea account"*,
*"Hai già un account? Accedi"*.

Validazione password **server-side** (policy in [`SECURITY.md`](SECURITY.md) §3). Al submit:
crea `User` (non verificato), invia email di verifica, reindirizza a **check-email**.

```
┌──────────────────────────────────────────────┐
│  Controlla la tua email                        │
│                                                │
│  Abbiamo inviato un link di conferma a         │
│  mario@azienda.it                              │
│  Clicca il link per attivare l'account.        │
│                                                │
│  Non hai ricevuto nulla?  Invia di nuovo (60s) │
└──────────────────────────────────────────────┘
```

### Step 2 — Email verification

Route: `/[locale]/verify-email` + API `/api/auth/verify-email`. La verifica è **obbligatoria**
prima del primo login. Token monouso con scadenza.

Stati:

- **Successo** → "Email verificata. Ti portiamo dentro…" → redirect a `welcome`.
- **Token scaduto** → "Il link è scaduto. Ne generiamo uno nuovo?" → CTA "Invia nuovo link".
- **Già verificato** → "Questo account è già attivo." → CTA "Vai al login".
- **Token non valido** → messaggio neutro (no enumeration) → CTA reinvio.

```
┌──────────────────────────────────────────────┐
│  ⚠  Link scaduto                               │
│  Il link di verifica non è più valido.         │
│  [   Inviami un nuovo link   ]                 │
└──────────────────────────────────────────────┘
```

### Step 3 — Welcome

Route: `/[locale]/welcome`. Primo contatto post-verifica: saluto + **goal selection opzionale**
(serve a personalizzare il primo insight, skippabile).

```
┌──────────────────────────────────────────────┐
│  Benvenuto in Anlyra 👋                        │
│  (nota: emoji solo in onboarding, non nella    │
│   UI di prodotto — vedi style guide)           │
│                                                │
│  Cosa vuoi tenere d'occhio per primo?          │
│  ( ) Flusso di cassa                           │
│  ( ) Margini e redditività                     │
│  ( ) Vendite e clienti                         │
│  ( ) Non sono sicuro, mostrami tutto           │
│                                                │
│  [ Continua ]      Salta per ora               │
└──────────────────────────────────────────────┘
```

### Step 4 — Org setup wizard (4 substep)

Route: `/[locale]/onboarding/*` + API `/api/onboarding`. Crea l'`Organization`, la `Membership`
(con `isDefault`), avvia il **trial 7 giorni** (per organizzazione).

**4.1 Info azienda**

```
Step 1 di 4 ──●───○───○───○
Parlaci della tua azienda
  Ragione sociale  [________________________]
  P.IVA            [___________]  (opzionale ora)
  [ Avanti ]
```

**4.2 Settore + dimensione**

```
Step 2 di 4 ──●───●───○───○
  Settore     [ Seleziona ▾ ]  (commercio, servizi, manifattura, …)
  Dipendenti  ( )1-9  ( )10-49  ( )50-249  ( )250+
  Fatturato   ( )<1M  ( )1-10M  ( )10-50M  ( )>50M
  [ Indietro ]   [ Avanti ]
```

**4.3 Import dati (skip)**

```
Step 3 di 4 ──●───●───●───○
Porta i tuoi dati in Anlyra
  [ Carica CSV ]   (drag & drop)
  Integrazioni: QuickBooks · Fatture in Cloud · Banca (PSD2)
  → "In arrivo" (pianificate — vedi docs/integrations/)
  [ Indietro ]   [ Salta, lo farò dopo ]
```

> Le integrazioni esterne sono **pianificate**, non attive (QuickBooks/Fatture in Cloud Q3 2026,
> PSD2 Q4 2026). In questo step si può solo caricare CSV o saltare.

**4.4 Invita il team**

```
Step 4 di 4 ──●───●───●───●
Invita i tuoi collaboratori (opzionale)
  Email  [______________]  Ruolo [ Membro ▾ ]   [ + Aggiungi ]
  [ Indietro ]   [ Concludi e vai alla dashboard ]
```

Genera `Invite` per email; il flow di accettazione collega il nuovo utente alla stessa org via
`Membership`.

### Step 5 — First insight + tour overlay

Route: `/[locale]/ai/insights`. Mostra il **primo insight AI** generato dai dati (o un esempio se
nessun dato è stato importato), con confidence score e dati sottostanti visibili. Un **tour overlay**
evidenzia le aree chiave della dashboard.

```
┌──────────────────────────────────────────────┐
│  Il tuo primo insight                          │
│  "Il flusso di cassa di questo mese è in calo  │
│   del 12% rispetto alla media trimestrale."    │
│  Confidence: 0,82   ▸ Vedi i dati              │
│                                                │
│  ( tour overlay: Sidebar → Finance → AI )      │
└──────────────────────────────────────────────┘
```

---

## 3. Email touchpoints

9 template transazionali (Resend). Copy in italiano, registro "tu", **nessuna emoji** nelle email
transazionali (vedi [`i18n/translation-style-guide.md`](i18n/translation-style-guide.md)).

| # | Template | Trigger | Contenuto chiave |
|---|---|---|---|
| 1 | `welcome` | Email verificata | Benvenuto, link alla dashboard, primi passi |
| 2 | `verify-email` | Signup | Link di verifica monouso (scadenza) |
| 3 | `password-reset` | Richiesta reset | Link reset monouso |
| 4 | `team-invite` | Invito dal wizard/settings | Link per unirsi all'org |
| 5 | `payment-confirmed` | `checkout.session.completed` | Conferma pagamento, fattura |
| 6 | `trial-3days` | Trial T-3 giorni | Avviso scadenza, CTA upgrade |
| 7 | `trial-1day` | Trial T-1 giorno | Ultimo promemoria |
| 8 | `trial-expired` | Trial scaduto | Account in sola lettura, CTA riattiva |
| 9 | `subscription-canceled` | `customer.subscription.deleted` | Conferma cancellazione, export dati |

Eventi trial/pagamento generati da Stripe + cron `trial-check` (vedi [`stripe-setup.md`](stripe-setup.md)
e [`DEPLOY.md`](DEPLOY.md) §9). Sequenza marketing complementare in
[`email/onboarding-sequence.md`](email/onboarding-sequence.md).

---

## 4. Edge cases

| Caso | Comportamento |
|---|---|
| **OAuth con email già esistente** (registrata via password) | Account linking: si associa il provider OAuth all'utente esistente dopo conferma; nessun account duplicato. |
| **Refresh durante il wizard** | Lo stato è persistito server-side (step corrente in `Organization`/sessione); al refresh si riprende dallo step giusto. |
| **Abbandono del wizard** | Al login successivo l'utente rientra nel wizard allo step non completato; org in stato "onboarding incompleto". |
| **Doppio submit signup** | Idempotente: secondo submit non crea un secondo utente; reinvio email rate-limited. |
| **Token verify scaduto/riusato** | Messaggio neutro (no enumeration) + CTA per nuovo link. |
| **Mobile responsive** | Wizard a step singolo per schermata; touch target ≥ 44px; tastiera adeguata per email/numeri. |
| **Accessibilità (WCAG 2.1 AA)** | Focus management tra step, label esplicite, contrasto ≥ 4.5:1, navigazione da tastiera, `aria-live` sugli errori. |
| **2FA attivo** | Dopo login, challenge TOTP prima dell'accesso alla dashboard; backup code come fallback. |

---

## 5. Schema dati (FASE D — già implementato)

> Non usare i modelli zombie (`User_b4`, `Organization_b7`, `Alert_b7`, ecc.) in query nuove.

- **User** — campi auth: `email` (unique), `passwordHash` (bcrypt, null se solo OAuth),
  `emailVerified` (timestamp), `name`, relazioni OAuth account, campi 2FA (`totpSecret`,
  `backupCodes`, `twoFactorEnabled`).
- **Organization** — `name`, `slug`, `vatNumber` (P.IVA, opzionale), `sector`, `sizeBand`,
  `revenueBand`, `plan`, stato trial (`trialEndsAt`), stato onboarding (`onboardingStep` / completed).
- **Membership** — collega `User` ↔ `Organization` con `role` e **`isDefault`** (org predefinita
  al login per utenti multi-org).
- **Invite** — `email`, `organizationId`, `role`, `token`, `expiresAt`, stato (`pending`/`accepted`).

Multi-org e subscription sono **per organizzazione**, non per utente (vedi CLAUDE.md decisioni FASE D).

---

## 6. Metriche funnel (eventi tracking)

11 eventi (product analytics — provider da decidere, PostHog vs Mixpanel):

1. `signup_start` — apertura form signup
2. `signup_complete` — utente creato
3. `email_verified` — verifica completata
4. `welcome_viewed` — schermata welcome
5. `wizard_step_1` — info azienda
6. `wizard_step_2` — settore/dimensione
7. `wizard_step_3` — import (o skip)
8. `wizard_step_4` — invite (o skip)
9. `wizard_complete` — org creata, trial avviato
10. `first_insight_viewed` — primo insight mostrato (**activation**)
11. `tour_completed` — tour overlay concluso

Ogni evento porta `organizationId`, `userId`, `locale` e `timestamp`. Da questi si calcolano i KPI
di §1.3.

---

## 7. Implementation status (onesto)

**✅ Implementato in FASE D:**

- NextAuth v5 (email/password + Google + Microsoft), config split edge-safe.
- Signup reale + verifica email obbligatoria (token monouso).
- Password policy server-side + 2FA TOTP (backup code).
- Onboarding wizard 4 substep + creazione `Organization`/`Membership`/trial.
- Multi-org via `Membership` (`isDefault`).
- Invite flow (generazione + accettazione).
- Route presenti: `/[locale]/signup`, `/verify-email`, `/welcome`, `/onboarding`, API
  `/api/auth/*`, `/api/onboarding`, `/api/auth/2fa/*`.
- Demo mode (`/api/auth/login-demo`) **rimossa**.

**🚧 Da rifinire / verificare:**

- **Data import wizard (step 4.3):** upload CSV end-to-end e mapping campi da completare; le
  integrazioni (QuickBooks/Fatture in Cloud/PSD2) restano **pianificate**.
- **Tour overlay (step 5):** da rifinire (copy + targeting elementi).
- **Verifica runtime end-to-end** dell'intero funnel (vedi
  [`codespace-recovery-procedure.md`](codespace-recovery-procedure.md)).
- **Account linking OAuth↔password:** confermare il comportamento in tutti i casi limite.
- **Product analytics:** provider e instrumentazione eventi da finalizzare.

---

## 8. Riferimenti tecnici

- **Auth, password policy, 2FA:** [`SECURITY.md`](SECURITY.md) §3.
- **Trial & eventi pagamento, price ID, webhook:** [`stripe-setup.md`](stripe-setup.md);
  cron `trial-check` in [`DEPLOY.md`](DEPLOY.md) §9.
- **Copy & tono (registro "tu", no emoji nelle email):** [`i18n/translation-style-guide.md`](i18n/translation-style-guide.md).
- **Sequenza email:** [`email/onboarding-sequence.md`](email/onboarding-sequence.md).
- **FAQ pubbliche:** [`FAQ.md`](FAQ.md).
- **File FASE D in codice:** `src/auth.ts`, `src/auth.config.ts`, `src/lib/auth/*`,
  `src/app/[locale]/{signup,verify-email,welcome,onboarding}`, `src/app/api/{auth,onboarding}`.

---

**Status:** FASE D implementata · blueprint di riferimento (living document).
**Last updated:** 2026-05-28.
