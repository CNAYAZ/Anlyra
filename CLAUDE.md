# CLAUDE.md — Guida operativa per sessioni di sviluppo Anlyra

> Documento di contesto per Claude nelle sessioni future. Versione **v4.0**.
> Leggere **prima** di toccare codice. Contiene decisioni consolidate, vincoli ferrei e lessons learned.

**Branch principale di sviluppo**: `claude/merge-repos-nextjs-rOZU3`.
**Stack**: Next.js 14 (App Router, `src/`), next-intl (IT primaria, EN secondaria), Prisma,
NextAuth v5, Anthropic Claude per AI insights, Stripe, Resend, Supabase (prod) / SQLite (dev).

**Working directory**: `/workspaces/Anlyra` (unica; non usare `/home/user/Anlyra`).
**File DB**: `prisma/dev.db` (UNICO file attivo). Il file `dev.db` nella root è archiviato come
`dev.db.FOSSILE-15maggio-NON-USARE` — non toccarlo mai.

**Demo org**: "Acme Analytics" (id: `demo-org`).
**Credenziali demo**: `demo@pro.app` / `DemoAnlyra2026!`
**Utente test**: `test1@example.com` / `TestAnlyra2026!`

---

## 0. Vincoli ferrei (non negoziabili)

- **Logout**: sempre via reload assoluto `window.location.href = /api/auth/logout?locale=${locale}`.
  Mai `router.push` / `router.replace`.
- **Modelli Prisma zombie** (`User_b4`, `Organization_b7`, `Alert_b7`, ecc.): NON usare in query
  nuove, NON rimuovere dalle migration.
- **Tabular nums** obbligatori su ogni numero visualizzato. **No emoji** nella UI di prodotto.
- **Token shadcn** (`--background`, `--foreground`, `--card`, ecc.): NON rinominare.
- **Branch feature + merge `--no-ff`** sempre. Verifica finale con `git ls-remote`.
- **Onestà**: distinguere sempre "implementato" da "pianificato" nei documenti.
- **AUTH_URL / NEXTAUTH_URL**: MAI impostare in sviluppo (né in `.env` né in `.env.local`).
  Causa self-proxy loop via X-Forwarded-Proto → 500 dopo 30s. Vedi `docs/dev-codespace-proxy-500.md`.
- **Gestore server UNICO**: il terminale col loop di auto-riavvio. MAI `npm run dev` diretto.
  Per riavviare: `pkill -f "next dev"` e attendere il riavvio automatico del loop.

---

## 1. Sessione giorno 4 — Blind mega-session

Sessione condotta in modalità cieca (Codespace offline per gran parte), ~23 task accumulati,
~85 file toccati, ~7500 righe, 23+ SHA.

### Pre-offline (Codespace attivo) — 4 debiti tecnici chiusi

- DEBITO 14 — Plans cleanup (SHA `c052295`)
- DEBITO 5 — Credits unification (SHA `f49bcea`)
- DEBITO 7 — `Alert_b7` rename (SHA `d68f986`)
- DEBITO 8 — Insight cleanup (SHA `09169aa`)
- DB demo preservato (1 user, 1 org, 922 financialRecords, 6 insights).

### Ciechi offline — output

- Biblioteca docs strategica (~30+ documenti in `docs/`).
- **FASE D Auth**: NextAuth v5 + multi-org via `Membership` + 2FA TOTP + onboarding wizard + invite flow.
- **Button asChild fix**: risolto crash `React.Children.only` su `/it`, `/en`, `/it/pricing`.
- **Security audit checklist** (51 items) — [`docs/security-audit-checklist.md`](docs/security-audit-checklist.md).
- **Codespace recovery procedure** (536 righe, 7 fasi) — [`docs/codespace-recovery-procedure.md`](docs/codespace-recovery-procedure.md).

### 4 documenti rotti (clipboard truncation)

`README.md`, `docs/SECURITY.md`, `docs/DEPLOY.md`, `docs/onboarding-flow.md` risultano truncati/stub.
Da rifare durante recovery (vedi FASE 5 della recovery procedure).

---

## 2. Decisioni FASE D consolidate

| Tema | Decisione |
|---|---|
| Auth library | NextAuth v5 (Auth.js), JWT session strategy (richiesto da Credentials provider) |
| Metodi login | Email/password + Google + Microsoft OAuth |
| Email verify | **Obbligatoria** prima del primo login |
| Password policy | Min 12 char + 1 maiuscola + 1 numero + 1 speciale, validata server-side |
| 2FA | TOTP opt-in con remind, speakeasy + qrcode, 10 backup code monouso |
| Multi-org | Per utente, via modello `Membership` esistente (NON nuovo modello) |
| Subscription | Per **organizzazione** (non per utente) |
| Trial | Per **organizzazione**, 7 giorni |
| Plan limits | Parametrizzati via env vars (placeholder finché pricing deciso) |
| Edge safety | Config split: `auth.config.ts` (edge-safe, no Node) vs `auth.ts` (Node, Prisma+bcrypt) |

---

## 3. Lessons learned

1-16: (storiche, vedi versioni precedenti del documento).

**#17 — Clipboard truncation**: la UI Anthropic può spezzare prompt lunghi (>2000 righe),
producendo file truncati. *Mitigation*: split prompt in 3-4 messaggi separati, confermare ricezione
di ogni chunk prima di procedere.

**#18 — Shell access ambiguity in modalità cieca**: Opus può affermare capacità shell senza poterle
verificare quando il Codespace è offline. *Lesson*: distinguere nettamente "Markdown-only ciechi"
(sicuro, nessun rischio) da "Codespace-required" (rischio allucinazione se la shell non è reale).

**#19 — Cross-reference network value**: 30+ documenti collegati tra loro creano di fatto un
*operational manual* navigabile. Ogni nuovo doc deve linkare i correlati per aumentare il valore composto.

**#20 — Strategic decisions before mega-prompts**: senza decisioni preliminari (stack, org model,
trial model), un mega-prompt come FASE D produrrebbe output incoerente. *Lesson*: consolidare le
decisioni in un decision log PRIMA di lanciare implementazioni grandi.

---

## 4. Stato corrente progetto (2026-06-10)

- [x] Design system v2 completo (5/5 fasi).
- [x] Sito pubblico funzionante (dopo Button fix).
- [x] AI insights generation operativa.
- [x] FASE D Auth — E2E PASSATO nel browser reale (2026-06-10).
- [x] ~30+ documenti strategici in `docs/`.
- [x] **BUG-CRITICAL-1 risolto** — root cause: MAI `AUTH_URL`/`NEXTAUTH_URL` nell'env di DEV
  (vale per **entrambi** `.env` e `.env.local`). Vedi `docs/dev-codespace-proxy-500.md`.
- [x] **ISSUE dati demo e Insights 500 risolti** — cause: (1) API insights derivava `type`/`priority`
  da `tone`/`impact` ignorando le colonne reali; (2) PATCH insights era finta e non persisteva;
  (3) `getOrgData` legge SOLO `financialRecord` e sintetizza il resto — `financialRecord` ora
  popolata specchiando le transazioni; formato `description` "categoria/sottocategoria" OBBLIGATORIO.
- [ ] Decision log credit pack pricing — **aperto** ([`docs/decisions/credit-pack-pricing.md`](docs/decisions/credit-pack-pricing.md)).
- [ ] **Validazione pivot PRODUCT-001** — zero sviluppo nuove feature prima dell'esito delle
  interviste ([`docs/decisions/product-direction.md`](docs/decisions/product-direction.md)).
- [ ] Security audit 51 items — da eseguire.
- [ ] OAuth/Stripe/Resend production — dopo security audit verde.
- [ ] Deploy production — ultimo step.

---

## 5. Procedura recovery (sintetica)

Quando il Codespace torna online, seguire [`docs/codespace-recovery-procedure.md`](docs/codespace-recovery-procedure.md):

1. Verifica integrità repository (15 min)
2. Verifica FASE D files (20 min)
3. Test runtime FASE D (45 min)
4. Verifica file ciechi non-FASE-D (60 min)
5. Rifare 4 documenti rotti (90 min)
6. Aggiornare questo CLAUDE.md (30 min)
7. Decisioni strategiche pendenti (libero)

**Gate operativo**: 10/10 criteri di successo ✅ prima di procedere con security audit + OAuth setup.

---

## 6. Guida modelli

| Modello | Quando usarlo |
|---|---|
| **Fable 5** | Diagnosi profonde, root-cause analysis, bug complessi |
| **Opus 4.8** | Codice critico: auth, schema Prisma, migration, sicurezza |
| **Sonnet 4.6** | Sviluppo normale: componenti, API routes, refactor |
| **Haiku 4.5** | Operazioni veloci nel Codespace: grep, cat, git status |

---

## 7. Mappa documenti strategici principali

- **Product direction**: [`docs/decisions/product-direction.md`](docs/decisions/product-direction.md) (PRODUCT-001)
- Pricing: [`docs/pricing-strategy-analysis.md`](docs/pricing-strategy-analysis.md), [`docs/decisions/credit-pack-pricing.md`](docs/decisions/credit-pack-pricing.md)
- Customer research: [`docs/customer-interview-template.md`](docs/customer-interview-template.md)
- AI: [`docs/ai/prompt-library.md`](docs/ai/prompt-library.md)
- Metriche: [`docs/kpi-definitions.md`](docs/kpi-definitions.md)
- Marketing: [`docs/marketing/landing-variants.md`](docs/marketing/landing-variants.md), [`docs/marketing-copy-library.md`](docs/marketing-copy-library.md)
- Sales: [`docs/sales/playbook.md`](docs/sales/playbook.md), [`docs/sales-pitch-deck-outline.md`](docs/sales-pitch-deck-outline.md)
- Email: [`docs/email/onboarding-sequence.md`](docs/email/onboarding-sequence.md)
- Investor: [`docs/investor-faq.md`](docs/investor-faq.md)
- Hiring: [`docs/hiring/plan-and-jd.md`](docs/hiring/plan-and-jd.md)
- Brand: [`docs/brand-guidelines.md`](docs/brand-guidelines.md)
- Security/Compliance: [`docs/security-audit-checklist.md`](docs/security-audit-checklist.md), [`docs/gdpr/`](docs/gdpr/)
- Proxy 500 root cause: [`docs/dev-codespace-proxy-500.md`](docs/dev-codespace-proxy-500.md)

---

## 8. LEZIONI OPERATIVE (giugno 2026)

**L25 — Container ≠ Codespace**: le sessioni Claude Code esterne girano in container remoti
(`CODESPACE_NAME` vuoto) — modifiche a DB e file gitignored NON arrivano nel Codespace, viaggia
solo git. Dichiarare SEMPRE l'ambiente a inizio report.

**L26 — Niente `!` nei one-liner bash**: il carattere `!` in bash interattivo trigghera la history
expansion e rompe i comandi.

**L27 — Comandi per il founder**: una riga, uno alla volta.

**L28 — Gli env file sono due**: `.env` e `.env.local`, con priorità a `.env.local`. Entrambi
vanno considerati quando si cerca la sorgente di una variabile.

**L29 — `dev.db` è gitignored**: i fix al DB vanno fatti nell'ambiente che il server usa davvero.
Un fix al DB in container non raggiunge il Codespace.

**L30 — Prima di un fix dati, verificare QUALI colonne il codice legge davvero**: caso
emblematico `tone`/`impact` — il codice leggeva colonne diverse da quelle che si credeva.

**L31 — Il codice da sessioni cieche può contenere endpoint finti e mock hardcoded**: la prova
di persistenza è SOLO una rilettura dal DB, mai l'UI ottimistica.

**L32 — Ogni merge va PROVATO nel report con `git log`**, mai solo dichiarato.

**L33 — UN SOLO gestore del server**: il terminale col loop di auto-riavvio. MAI lanciare
`npm run dev` direttamente — solo `pkill -f "next dev"` e attendere il riavvio automatico.

**L34 — I feature branch possono avere nomi diversi da quelli richiesti**: riportare sempre
il nome REALE del branch pushato.

---

**Versione**: v4.0.
**Last updated**: 2026-06-10.
**Audience**: Claude nelle sessioni future di sviluppo Anlyra.
