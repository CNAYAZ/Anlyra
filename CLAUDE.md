# CLAUDE.md — Guida operativa per sessioni di sviluppo Anlyra

> Documento di contesto per Claude/Opus nelle sessioni future. Versione **v7**.
> Leggere **prima** di toccare codice. Contiene decisioni consolidate, vincoli ferrei e lessons learned.

**Branch principale di sviluppo**: `claude/merge-repos-nextjs-rOZU3`.
**Stack**: Next.js 14 (App Router, `src/`), next-intl (IT primaria, EN secondaria), Prisma,
NextAuth v5, Anthropic Claude per AI insights, Stripe, Resend, Supabase (prod) / SQLite (dev).

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

## 4. Stato corrente progetto

- [x] Design system v2 completo (5/5 fasi).
- [x] Sito pubblico funzionante (dopo Button fix).
- [x] AI insights generation operativa.
- [x] FASE D Auth implementata — **da verificare a runtime** (vedi recovery procedure).
- [x] ~30+ documenti strategici in `docs/`.
- [ ] Decision log credit pack pricing — **aperto** ([`docs/decisions/credit-pack-pricing.md`](docs/decisions/credit-pack-pricing.md)).
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

## 6. Mappa documenti strategici principali

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

---

**Versione**: v7.  
**Last updated**: 2026-05-27.  
**Audience**: Claude/Opus nelle sessioni future di sviluppo Anlyra.
