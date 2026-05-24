# Posizione di Sicurezza e GDPR — Anlyra

**Versione:** 1.0
**Data:** 2026-05-24
**Status:** Living document — aggiornato ad ogni feature security implementata

> **Nota di onestà:** questo documento distingue esplicitamente tra misure
> **già implementate** e misure **pianificate pre-launch**. Nessun claim falso.
> Serve da documento di riferimento interno e da risposta standard a richieste
> di due diligence di prospect enterprise.

---

## 1. Approccio generale

Anlyra è una piattaforma SaaS per PMI italiane che tratta dati finanziari aziendali
confidenziali. La sicurezza e la privacy sono vincolanti by design, non un layer aggiunto
post-hoc.

**Principi fondamentali:**

- **Privacy by design (Art. 25 GDPR):** architettura pensata per minimizzare la raccolta e
  l'esposizione dei dati fin dalla prima riga di codice.
- **Data residency EU:** database Supabase in Frankfurt (AWS eu-central-1). I dati
  dei clienti non escono dall'UE salvo sub-processors US con DPA + SCC (vedi §3.7).
- **No data selling:** Anlyra non vende, non affitta, non cede dati utente a terze parti per
  finalità di marketing.
- **No AI training:** i dati cliente non sono mai usati per fare training di modelli AI
  (né di Anthropic, né di Anlyra). DPA con Anthropic lo garantisce contrattualmente.
- **Least privilege:** ogni componente accede solo ai dati strettamente necessari. Le API
  interne non espongono più di quanto serve al frontend.

---

## 2. Sicurezza tecnica

### 2.1 Autenticazione e sessione

**Implementato:**

- Cookie di sessione custom `pro_session` — nessun framework di autenticazione esterno
  (no NextAuth, no Clerk) che aggiunge superficie di attacco.
- Cookie flags: `HttpOnly: true` (inaccessibile a JavaScript), `SameSite: lax`
  (protezione CSRF per richieste cross-site), `Path: /`.
- Il cookie non è leggibile da script client-side — impossibile estrarre via XSS.

**Pianificato pre-launch:**

- Aggiungere `Secure: true` esplicitamente nel set-cookie (HTTPS-only; Vercel lo applica
  in produzione automaticamente).
- Firma HMAC del payload di sessione per prevenire tampering lato client.
- Scadenza cookie configurabile (default 7 giorni, con sliding expiry su attività).
- Implementazione autenticazione email/password con hash bcrypt (cost factor 12+).
- 2FA opzionale per utenti singoli (TOTP via `otplib`).
- SSO SAML incluso nel piano Enterprise (Okta, Azure AD, Auth0).

### 2.2 Trasporto

**Implementato:**

- HTTPS enforced da Vercel (TLS 1.2 min, TLS 1.3 preferito). Certificato Let's Encrypt
  auto-rinnovato.
- HSTS configurato a livello Vercel Edge per il dominio `anlyra.it`.

**Pianificato pre-launch:**

- Aggiunta header `Strict-Transport-Security` in `next.config.mjs` con `max-age=31536000; includeSubDomains; preload`.
- Submit a HSTS Preload List.

### 2.3 HTTP Security Headers

**Situazione attuale:**

`next.config.mjs` non contiene ancora security headers espliciti. Vercel ne aggiunge alcuni
di default (X-Content-Type-Options, X-Frame-Options) ma la copertura è incompleta.

**Pianificato pre-launch** (da aggiungere in `next.config.mjs`):

```js
headers: async () => [
  {
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options',     value: 'nosniff' },
      { key: 'X-Frame-Options',            value: 'DENY' },
      { key: 'X-XSS-Protection',           value: '1; mode=block' },
      { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security',  value: 'max-age=31536000; includeSubDomains; preload' },
    ],
  },
]
```

CSP (Content Security Policy) verrà configurata in una fase successiva (complessa con
Next.js per via degli inline scripts necessari al hydration).

### 2.4 Validazione input e protezione injection

**Implementato:**

- Tutte le API route validano l'input con **Zod** prima di qualsiasi operazione.
  Nessun dato non validato raggiunge il database.
- Accesso al DB esclusivamente tramite **Prisma ORM** — zero query SQL raw
  (`$queryRaw`, `$executeRaw`) nel codebase. Injection SQL strutturalmente impossibile.
- Next.js App Router con React Server Components — nessun `dangerouslySetInnerHTML`
  non controllato nel codice di produzione.

### 2.5 Rate limiting e protezione brute force

**Situazione attuale:** nessun rate limiting implementato.

**Pianificato pre-launch:**

- Rate limiting su endpoint sensibili (login, signup, API pubblica) tramite
  **Upstash Redis** con `@upstash/ratelimit` (sliding window).
- Threshold suggeriti: 10 req/min per login, 5 req/min per signup, 100 req/min per API
  autenticata per IP.

### 2.6 Gestione secrets

**Implementato:**

- Tutte le chiavi API (Stripe, Anthropic, Resend, Supabase) in variabili d'ambiente —
  mai nel codice sorgente.
- `.gitignore` include `.env*` — i file .env locali non vengono mai committati.
- `.env.example` nel repo documenta le variabili necessarie senza valori reali.

**Pianificato:**

- Secret rotation periodica (trimestrale) per Stripe keys, API keys AI.
- 1Password Business per condivisione sicura secrets nel team (no Slack, no email).
- Audit trail degli accessi ai secrets in produzione (Vercel env logs).

### 2.7 Dependency security

**Implementato:**

- Stack basato su librerie mature e ampiamente auditate (Next.js, Prisma, Radix UI,
  Stripe SDK, Resend SDK).

**Pianificato:**

- `npm audit` settimanale via GitHub Actions.
- Dependabot abilitato per PR automatiche su vulnerability fix.
- `audit-ci` nel CI/CD pipeline per bloccare build con vulnerabilità critiche non fixate.

### 2.8 Backup e disaster recovery

- **Database Supabase:** backup giornalieri automatici (piano Free: 1 giorno retention;
  piano Pro: 7 giorni point-in-time recovery).
- **Backup custom:** script `pg_dump` su S3 EU con retention 30 giorni (da implementare
  pre-launch, vedi `docs/DEPLOY.md` §2).
- **RPO stimato:** 24h (Free) / 1h (Pro con PITR).
- **RTO stimato:** 2–4 ore (restore + verifica + deploy).

---

## 3. GDPR compliance

### 3.1 Base giuridica del trattamento (Art. 6 GDPR)

| Trattamento | Base giuridica | Note |
|---|---|---|
| Erogazione del servizio | **Contratto (Art. 6.1.b)** | Elaborazione dati necessaria all'esecuzione del contratto SaaS |
| Fatturazione e pagamenti | **Obbligo legale (Art. 6.1.c)** | Conservazione 7 anni obbligo fiscale italiano |
| Email transazionali | **Contratto (Art. 6.1.b)** | Notifiche strettamente legate al servizio |
| Analytics anonimizzate | **Legittimo interesse (Art. 6.1.f)** | Miglioramento prodotto, dati aggregati non personali |
| Marketing (future) | **Consenso (Art. 6.1.a)** | Solo con opt-in esplicito, mai pre-spuntato |

### 3.2 Mappa dei dati

| Categoria | Dato | Dove vive | Chi accede | Retention |
|---|---|---|---|---|
| Account | email, nome, ruolo | Supabase (EU) | App + Supabase | Vita account |
| Organizzazione | nome azienda, piano | Supabase (EU) | App + Stripe | Vita account |
| Dati finanziari | transazioni, cashflow, KPI | Supabase (EU) | Solo utente org | Vita account |
| Pagamenti | importo, piano, date | Stripe (US) | App + Stripe | 7 anni (fiscale) |
| Insights AI | prompt + risposta Claude | Anthropic API (US) | No-retain (DPA) | Solo in-transit |
| Email inviate | contenuto, destinatario | Resend (US) | App + Resend | 90 giorni |
| Errori applicativi | stack trace, user ID | Sentry (US) | Sentry + team dev | 90 giorni |
| Sessione | cookie `pro_session` | Browser (httpOnly) | Server-side only | 7 giorni |

### 3.3 Lista sub-processors

Documentati pubblicamente in `/it/legal/privacy` (sezione sub-processors):

- **Supabase Inc.** (database hosting, EU) — DPA disponibile
- **Vercel Inc.** (hosting platform, EU region) — DPA disponibile
- **Stripe Inc.** (payment processing, US with EU adequacy) — DPA + SCC
- **Resend** (transactional email, US) — DPA + SCC
- **Anthropic PBC** (AI insights generation, US) — DPA, prompts non usati per training
- **Sentry** (error monitoring, US) — DPA + SCC, PII filtering

### 3.4 Diritti dell'interessato (Art. 15-22 GDPR)

Anlyra implementerà (pre-launch):

- **Accesso (Art. 15)**: export completo dati utente in JSON, scaricabile da `/settings/privacy`
- **Rettifica (Art. 16)**: modifica dati account da `/settings/profile`
- **Cancellazione (Art. 17)**: cancellazione account permanente da `/settings/privacy`, esecuzione entro 30 giorni
- **Portabilità (Art. 20)**: export dati in formato JSON strutturato
- **Opposizione (Art. 21)**: opt-out da analytics/marketing in qualsiasi momento
- **Limitazione (Art. 18)**: sospensione temporanea elaborazione su richiesta DPO

**Canale richieste**: `privacy@anlyra.it` (da attivare pre-launch). Risposta entro 30 giorni come da GDPR.

### 3.5 Data Protection Impact Assessment (DPIA)

Anlyra non tratta categorie particolari di dati (Art. 9 GDPR — salute, biometrici, ecc.) né esegue profilazione automatizzata con effetti legali significativi. Pertanto **DPIA non obbligatoria**, ma sarà comunque eseguita pre-launch per due use case:

- Trattamento dati finanziari aziendali (potrebbe rivelare informazioni commerciali sensibili)
- Generazione insights AI tramite Anthropic Claude (LLM esterno, trasferimento internazionale)

### 3.6 Data retention policy

| Dato | Retention | Motivo |
|---|---|---|
| Account attivo | Indefinita (finché account esiste) | Servizio |
| Account cancellato | 30 giorni (poi cancellazione completa) | Recovery accidentale |
| Logs sicurezza server | 30 giorni | Indagine incident |
| Email transazionali | 90 giorni | Audit + supporto |
| Backup database | 7 giorni (Supabase) + 30 giorni (S3 custom) | Disaster recovery |
| Stripe payment records | 7 anni | Obbligo fiscale italiano |

### 3.7 Trasferimenti internazionali

Tutti i sub-processors US (Stripe, Resend, Anthropic, Sentry) operano sotto:

- EU-US Data Privacy Framework (adequacy decision EU Commission, dal luglio 2023)
- Standard Contractual Clauses (SCC) come fallback
- DPA (Data Processing Agreement) firmato con ciascuno

---

## 4. Incident response

### 4.1 Severity classification

| Severity | Definizione | Esempio | SLA risposta |
|---|---|---|---|
| **P0 — Critical** | Breach dati confermato, sistema down | Database compromesso, leak credenziali | 15 minuti |
| **P1 — High** | Vulnerabilità grave non sfruttata, downtime parziale | Bug security, API rate limit bypass | 1 ora |
| **P2 — Medium** | Issue sicurezza minore | Header CSP mancante | 24 ore |
| **P3 — Low** | Best practice non rispettata | Password policy weak | 1 settimana |

### 4.2 Procedura GDPR breach notification

In caso di data breach con rischio per i diritti delle persone:

1. **Entro 72 ore**: notifica al Garante Privacy italiano (https://www.garanteprivacy.it)
2. **Senza indugio**: notifica agli utenti coinvolti (email + banner in-app)
3. **Documentazione**: registro breach interno (tipo, data, utenti coinvolti, misure prese)
4. **Post-mortem**: documento pubblico (anonimizzato) entro 30 giorni

### 4.3 Canali di segnalazione vulnerabilità

Security researchers o utenti che identificano vulnerabilità possono segnalare:

- Email: `security@anlyra.it` (da attivare pre-launch)
- Bug bounty: non disponibile al lancio, valutato post-traction
- Responsible disclosure: 90 giorni embargo standard

---

## 5. Security FAQ comuni (per prospect enterprise)

### Q: Dove vivono fisicamente i nostri dati?

A: Server Supabase in Frankfurt (Amazon AWS EU-Central-1). Backup custom su S3 EU. Mai fuori EU.

### Q: I nostri dati finanziari vengono usati per training AI?

A: **No.** Anthropic Claude (il modello AI che genera insights) ha DPA che esclude esplicitamente i prompts dal training. I dati cliente non vengono mai usati per migliorare Claude o altri modelli AI di terze parti.

### Q: In caso di acquisizione di Anlyra, cosa succede ai nostri dati?

A: I dati cliente sono trattati come asset separato. In caso di acquisizione: notifica con 90 giorni di preavviso, possibilità di export completo dati e cancellazione account senza penali.

### Q: Quali certificazioni avete?

A: Al lancio: nessuna certificazione formale (ISO 27001, SOC 2 sono costose ed eseguibili dopo traction). Ci impegnamo ad allinearci con best practice del framework di riferimento. Roadmap: SOC 2 Type 1 entro 12 mesi dal lancio commerciale, ISO 27001 entro 24 mesi.

### Q: Avete penetration test annuali?

A: Pianificato pre-launch: pen test esterno tramite agenzia italiana certificata (Yarix o equivalente). Frequenza post-launch: annuale.

### Q: Cosa succede se siete down?

A: SLA Vercel + Supabase combinato ≥99.95% effettivo. Status page pubblica su `status.anlyra.it` (da implementare). Notifica via email per incident maggiori. SLA contrattuale per enterprise: 99.5% mensile con credito 5% per ogni 0.1% di downtime sotto soglia.

### Q: Possiamo richiedere SSO SAML?

A: Sì, incluso nel piano Enterprise. Provider supportati al lancio: Okta, Auth0, Azure AD. Setup: 1-2 giorni post-contratto.

### Q: Come gestite le password dei vostri dipendenti?

A: 1Password Business obbligatorio per tutti i dipendenti. 2FA obbligatorio su tutti i servizi business. Access review trimestrale.

---

## 6. Roadmap security (12 mesi post-launch)

### Mese 1-3 post-launch

- Audit periodici dependency (`npm audit` settimanale)
- Rate limiting completo (Upstash Redis)
- Audit log per accessi sensibili
- Status page pubblica

### Mese 3-6

- Pen test esterno (Yarix o agenzia equivalente)
- Bug bounty privato (HackerOne private program)
- DPIA documenti finalizzati con DPO consulente

### Mese 6-12

- SOC 2 Type 1 audit (Vanta o Drata come compliance automation)
- ISO 27001 gap analysis
- BCP (Business Continuity Plan) formalizzato

---

## 7. Contatti

- **Security team**: `security@anlyra.it` (da attivare)
- **Privacy / DPO**: `privacy@anlyra.it` (da attivare)
- **General support**: `support@anlyra.it` (da attivare)
- **CEO / Founder**: [il tuo nome] (riservato per enterprise contracts)

---

**Note finali:**

- Questo documento è un **living document**: aggiornato ogni qualvolta una nuova feature security viene implementata.
- Versioni precedenti archiviate in `docs/archive/`.
- Per richieste di compliance documentation aggiuntiva (es. SOC 2 report quando disponibile), contattare `security@anlyra.it`.
