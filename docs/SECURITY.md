# Security & GDPR Posture — Anlyra

**Versione:** 2.0
**Last updated:** 2026-05-28
**Status:** Living document — aggiornato a ogni feature security implementata.
**Audience:** prospect enterprise, security review / due diligence, DPO.

> **Nota di onestà.** Questo documento distingue esplicitamente tra misure **già implementate** e
> misure **pianificate pre-launch**. Nessun claim falso. Serve da riferimento interno e da risposta
> standard alle richieste di due diligence enterprise.

**Documenti correlati**: [`security-audit-checklist.md`](security-audit-checklist.md) (51 item),
[`postgres-migration-plan.md`](postgres-migration-plan.md), [`privacy-dpia-template.md`](privacy-dpia-template.md),
[`gdpr/subprocessor-list.md`](gdpr/subprocessor-list.md), [`incident-response-playbook.md`](incident-response-playbook.md),
[`DEPLOY.md`](DEPLOY.md).

---

## 1. Security overview

Anlyra tratta dati finanziari e operativi aziendali confidenziali. La sicurezza e la privacy sono
vincolanti **by design**, non un layer aggiunto post-hoc.

**Principi fondamentali:**

- **Privacy by design (Art. 25 GDPR)** — architettura pensata per minimizzare raccolta ed
  esposizione dei dati fin dalla prima riga di codice.
- **Defense in depth** — controlli su più livelli (edge, applicazione, DB, sub-processor); il
  fallimento di un controllo non compromette l'intero sistema.
- **Least privilege** — ogni componente accede solo ai dati strettamente necessari; le API interne
  non espongono più del necessario al frontend; accesso ai dati bancari/finanziari limitato per ruolo.
- **Data residency EU** — database in EU (Frankfurt/Stockholm). I dati non escono dall'UE salvo
  sub-processor US coperti da DPA + SCC / Data Privacy Framework (§7).
- **No data selling** — Anlyra non vende, affitta o cede dati utente a terzi per marketing.
- **No AI training** — i dati cliente non sono mai usati per addestrare modelli AI (Anthropic né
  proprietari). Garantito contrattualmente dal DPA con Anthropic.

---

## 2. Data protection

### 2.1 Encryption at rest

- **Implementato (prod target):** database Supabase Postgres cifrato **AES-256** at rest (default
  della piattaforma). Storage e backup cifrati.
- **Token integrazioni** (OAuth refresh token per QuickBooks/Fatture in Cloud/PSD2 — pianificate):
  cifrati a livello applicativo prima della persistenza in `IntegrationConnection`.

### 2.2 Encryption in transit

- **Implementato:** HTTPS enforced (TLS 1.2 minimo, TLS 1.3 preferito). Certificati gestiti da
  Vercel, auto-rinnovati. Connessione app ↔ Supabase su TLS.
- **HSTS:** `Strict-Transport-Security` con `max-age` lungo + `includeSubDomains; preload`
  (configurato in `next.config.mjs`, vedi §4).

### 2.3 Data residency

- **EU only.** Database e backup primari in EU (Supabase Frankfurt — AWS `eu-central-1`; failover
  Stockholm). Vercel servito da region EU.
- Sub-processor US (Stripe, Resend, Anthropic, Sentry) trattano dati specifici e limitati sotto
  DPA + SCC / DPF (§7).

### 2.4 Backup strategy

- **Supabase:** backup giornalieri automatici; point-in-time recovery sul piano Pro.
- **Custom (pre-launch):** `pg_dump` schedulato su storage EU, **retention 30 giorni**.
- **RPO** stimato: 1–24h (in base al piano). **RTO** stimato: 2–4h (restore + verifica + deploy).
- Procedura di restore documentata in [`DEPLOY.md`](DEPLOY.md) e nel runbook di recovery.

---

## 3. Authentication & access

Aggiornato a **FASE D** (NextAuth v5 implementata; il precedente cookie custom `pro_session` e la
demo mode sono stati rimossi).

- **Framework:** NextAuth v5 (Auth.js), strategia sessione **JWT** (richiesta dal Credentials
  provider). Config split edge-safe: `auth.config.ts` (no Node, usato dal middleware) vs `auth.ts`
  (Node — Prisma + bcrypt).
- **Metodi di login:** email/password, Google OAuth, Microsoft OAuth.
- **Verifica email:** **obbligatoria** prima del primo login (token monouso a scadenza).
- **Password policy:** minimo 12 caratteri, ≥1 maiuscola, ≥1 numero, ≥1 carattere speciale,
  validata **server-side**. Hash **bcrypt** (cost factor ≥12).
- **2FA:** TOTP opt-in (speakeasy + qrcode) con 10 backup code monouso; reminder all'utente.
- **Session management:** cookie `HttpOnly`, `SameSite`, `Secure` in produzione; scadenza con
  sliding expiry; logout via reload assoluto server-side.
- **Multi-org & RBAC:** appartenenza via modello `Membership` (ruoli per organizzazione). Accesso
  ai dati sempre scoping per org dell'utente; nessun cross-org leakage.
- **Pianificato:** SSO SAML per piano Enterprise (Okta, Azure AD, Auth0).

---

## 4. Application security — OWASP Top 10

| OWASP (2021) | Mitigazione Anlyra | Stato |
|---|---|---|
| A01 Broken Access Control | Scoping per org su ogni query; controllo ruolo `Membership`; nessun IDOR (id validati + ownership check) | Implementato |
| A02 Cryptographic Failures | TLS in transit, AES-256 at rest, bcrypt password, token integrazioni cifrati | Implementato / target prod |
| A03 Injection | Input validato con **Zod** su ogni API route; DB solo via **Prisma ORM**, zero SQL raw | Implementato |
| A04 Insecure Design | Privacy/security by design; threat model rivisto per feature sensibili | Continuo |
| A05 Security Misconfiguration | Security headers in `next.config.mjs` (§sotto); secrets in env, mai nel codice | Implementato / in hardening |
| A06 Vulnerable Components | Dipendenze mature; `npm audit` + Dependabot pianificati in CI | Parziale |
| A07 Auth Failures | NextAuth v5, password policy forte, 2FA TOTP, email verify, rate limit login (pianificato) | Implementato / hardening |
| A08 Data Integrity Failures | Webhook firmati verificati (Stripe; provider integrazioni HMAC); lockfile dipendenze | Implementato |
| A09 Logging/Monitoring | Sentry (pianificato), audit log accessi sensibili, breach register | Pianificato |
| A10 SSRF | Nessuna fetch di URL forniti dall'utente; allowlist redirect OAuth | Implementato |

**Security headers** (`next.config.mjs`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrittiva,
`Strict-Transport-Security`. **CSP** in roadmap (complessa con gli inline script di hydration Next.js).

**Rate limiting:** pianificato pre-launch su login/signup/API pubblica via **Upstash Redis**
(`@upstash/ratelimit`, sliding window) — soglie indicative: 10 req/min login, 5 req/min signup.

---

## 5. AI security

- **Prompt injection mitigation:** input utente trattato come dato, non come istruzione; prompt
  template con separazione netta tra istruzioni di sistema e dati; campi testo sospetti sanitizzati.
  L'AUP vieta esplicitamente prompt injection ([`legal/aup.md`](legal/aup.md) §2.3).
- **Output validation:** output del modello validato con **Zod** prima dell'uso/persistenza; gli
  insight mostrano sempre **confidence score** e dati sottostanti (no scatola nera).
- **Data minimization verso Anthropic:** inviati solo i dati strettamente necessari a generare
  l'insight; nessun invio massivo non necessario. Pattern dettagliati in [`ai/prompt-library.md`](ai/prompt-library.md).
- **No training (DPA):** il DPA con Anthropic esclude contrattualmente l'uso dei prompt per il
  training. Dati AI solo in-transit, no retention lato modello.

---

## 6. Infrastructure security

- **Vercel:** hosting serverless, HTTPS-only, certificati gestiti, env vars cifrate, deploy
  immutabili con rollback istantaneo.
- **Supabase:** Postgres gestito EU, cifratura at rest, backup, RLS valutata per layer aggiuntivo.
- **Secrets:** tutte le chiavi (Stripe, Anthropic, Resend, Supabase, AUTH_SECRET) in env vars; mai
  nel codice. `.gitignore` esclude `.env*`; `.env.example` documenta le variabili senza valori reali.
  Rotation periodica (trimestrale) e password manager business per la condivisione (pianificato).
- **HTTPS-only + HSTS** su `anlyra.it`; redirect HTTP→HTTPS a livello edge.

---

## 7. GDPR compliance map

### 7.1 Base giuridica (Art. 6)

| Trattamento | Base giuridica | Note |
|---|---|---|
| Erogazione del servizio | Contratto (Art. 6.1.b) | Necessario all'esecuzione del contratto SaaS |
| Fatturazione e pagamenti | Obbligo legale (Art. 6.1.c) | Conservazione 7 anni (fiscale IT) |
| Email transazionali | Contratto (Art. 6.1.b) | Strettamente legate al servizio |
| Analytics anonimizzate | Legittimo interesse (Art. 6.1.f) | Dati aggregati non personali |
| Marketing (future) | Consenso (Art. 6.1.a) | Solo opt-in esplicito, mai pre-spuntato |

### 7.2 Diritti dell'interessato (Art. 15-22)

- **Accesso (15)** — export completo dati in JSON da `/settings/privacy`.
- **Rettifica (16)** — modifica dati account da `/settings/profile`.
- **Cancellazione (17)** — cancellazione permanente da `/settings/privacy`, eseguita entro 30 giorni.
- **Portabilità (20)** — export in formato JSON strutturato machine-readable.
- **Opposizione (21)** — opt-out analytics/marketing in qualsiasi momento.
- **Limitazione (18)** — sospensione temporanea su richiesta tramite DPO.

Canale richieste: `privacy@anlyra.it` — risposta entro 30 giorni come da GDPR.

### 7.3 Sub-processors

Elenco pubblico e versionato in [`gdpr/subprocessor-list.md`](gdpr/subprocessor-list.md) e su
`/it/legal/privacy`:

| Sub-processor | Uso | Sede | Garanzie |
|---|---|---|---|
| Supabase Inc. | Database hosting | EU (Frankfurt) | DPA |
| Vercel Inc. | Hosting platform | EU region | DPA |
| Stripe Inc. | Pagamenti | US (adeguatezza EU) | DPA + SCC |
| Resend | Email transazionali | US | DPA + SCC |
| Anthropic PBC | AI insight | US | DPA, no-training |
| Sentry | Error monitoring | US | DPA + SCC, PII filtering |

### 7.4 DPO

DPO esterno (consulente). Punto di contatto unico per interessati e Garante; coinvolto nelle DPIA e
nella gestione breach.

### 7.5 Breach notification (72h)

In caso di data breach con rischio per i diritti delle persone:

1. **Entro 72 ore** — notifica al Garante Privacy italiano.
2. **Senza indugio** — notifica agli utenti coinvolti (email + banner in-app).
3. **Documentazione** — registro breach interno (tipo, data, utenti, misure).
4. **Post-mortem** — documento (anonimizzato) entro 30 giorni.

Procedura operativa in [`incident-response-playbook.md`](incident-response-playbook.md).

### 7.6 DPIA per high-risk processing

DPIA eseguita pre-launch (template in [`privacy-dpia-template.md`](privacy-dpia-template.md)) per:

- Trattamento dati finanziari aziendali (potenziali informazioni commerciali sensibili).
- Generazione insight AI tramite LLM esterno (trasferimento internazionale).

### 7.7 Trasferimenti internazionali

Sub-processor US sotto: EU-US Data Privacy Framework (adeguatezza, lug 2023), SCC come fallback,
DPA firmato con ciascuno.

---

## 8. Compliance roadmap

- **0–3 mesi post-launch:** `npm audit` settimanale, rate limiting completo, audit log, status page.
- **3–6 mesi:** pen test esterno (agenzia certificata), bug bounty privato, DPIA finalizzate con DPO.
- **Entro 12 mesi:** **SOC 2 Type 1** (compliance automation tipo Vanta/Drata).
- **Entro 24 mesi:** **ISO 27001** (gap analysis → certificazione), BCP formalizzato.

---

## 9. Responsible disclosure

- **Canale:** `security@anlyra.it`.
- **Scope:** dominio `anlyra.it`, applicazione e API. Fuori scope: DoS/DDoS, social engineering,
  attacchi fisici, sub-processor di terze parti.
- **Safe harbor:** la ricerca in buona fede entro lo scope non comporta azioni legali; vietato
  accedere/alterare dati di altri utenti.
- **Bug bounty:** non disponibile al lancio; valutato post-traction (programma privato).
- **Embargo:** responsible disclosure con 90 giorni standard prima della divulgazione pubblica.

---

## 10. Enterprise security FAQ

**Q: Dove vivono fisicamente i nostri dati?**
A: Server EU (Supabase Frankfurt, AWS `eu-central-1`; failover Stockholm). Backup su storage EU. Mai fuori UE per i dati primari.

**Q: I nostri dati finanziari vengono usati per il training AI?**
A: No. Il DPA con Anthropic esclude i prompt dal training. I dati cliente non addestrano mai alcun modello AI.

**Q: Che autenticazione usate?**
A: NextAuth v5 con email/password (bcrypt), OAuth Google/Microsoft, verifica email obbligatoria, password policy forte e 2FA TOTP opt-in. SSO SAML su piano Enterprise (roadmap).

**Q: Come isolate i dati tra organizzazioni diverse?**
A: Ogni query è scoping per org via modello `Membership`; controlli di ownership e ruolo su ogni endpoint. Nessun accesso cross-org.

**Q: In caso di acquisizione di Anlyra, cosa succede ai nostri dati?**
A: Trattati come asset separato. Notifica con 90 giorni di preavviso, export completo e cancellazione senza penali.

**Q: Quali certificazioni avete?**
A: Al lancio nessuna formale. Roadmap: SOC 2 Type 1 entro 12 mesi, ISO 27001 entro 24 mesi. Allineamento alle best practice fin da subito.

**Q: Fate penetration test?**
A: Pianificato pre-launch tramite agenzia certificata; a regime con cadenza annuale.

**Q: Cosa succede se siete down?**
A: SLA combinato Vercel + Supabase elevato; status page pubblica (in arrivo). SLA contrattuale per Enterprise con credito al cliente sotto soglia.

**Q: Possiamo richiedere SSO SAML?**
A: Sì, incluso nel piano Enterprise (Okta, Auth0, Azure AD). Setup 1–2 giorni post-contratto.

**Q: Come gestite le credenziali del vostro team?**
A: Password manager business obbligatorio, 2FA su tutti i servizi, access review trimestrale.

---

## 11. Incident response

Classificazione severity, procedure di escalation, runbook P0–P3 e gestione comunicazione sono
documentati in [`incident-response-playbook.md`](incident-response-playbook.md). La procedura GDPR
breach notification (72h) è in §7.5.

---

## 12. Contatti

- **Security:** `security@anlyra.it`
- **Privacy / DPO:** `privacy@anlyra.it`
- **Support:** `support@anlyra.it`

---

**Status:** living document · versione 2.0. Aggiornato a ogni feature security implementata.
**Last updated:** 2026-05-28.
