---
title: Anlyra · Codespace Recovery Procedure
version: 1.0
audience: founder / dev (quando Codespace torna online)
status: operativo
applies: post-sessione cieca giorno 4
estimated time: 4-5 ore totali
---

# Codespace Recovery Procedure

> Procedura ordinata da eseguire **NEL MOMENTO ESATTO** in cui Codespace torna online.
>
> Seguire **in ordine sequenziale**. Non saltare step. Ogni step ha criteri di successo e fallback chiari.

## Pre-requisiti

- Codespace `cautious-funicular-qwvw4x969rp3xqp4` online e responsive
- Browser pronto per test visual QA
- Documento aperto per annotare risultati (Notion, Google Doc, o simile)
- Tempo dedicato: 4-5 ore senza interruzioni
- Snack + caffè

---

## FASE 1 — Verifica integrità repository (15 min)

### Step 1.1 — Verifica Git pulito

```bash
cd /workspaces/anlyra
git fetch origin --all --prune
git checkout claude/merge-repos-nextjs-rOZU3
git pull origin claude/merge-repos-nextjs-rOZU3
git log --oneline -10
```

**Atteso**: ultimi 10 commit visibili, incluso SHA `9b5b9c7` (security audit checklist) come HEAD.

**Fallback**: se HEAD diverso o pull fallisce, eseguire `git status` e debug state prima di proseguire.

### Step 1.2 — Conta file modificati durante sessione cieca

```bash
git log --since="3 days ago" --pretty=format:"%h %s" --shortstat
```

**Atteso**: ~85-100 file modificati, ~7500-10000 righe aggiunte nell'arco della sessione cieca.

### Step 1.3 — Verifica integrità DB

```bash
ls -la prisma/dev.db prisma/dev.db.before-fase-d-* 2>/dev/null || echo "no backup found"
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
Promise.all([
  prisma.user.count(),
  prisma.organization.count(),
  prisma.membership.count(),
  prisma.financialRecord.count(),
  prisma.insight.count(),
]).then((c) => console.log('DB state:', { user: c[0], org: c[1], member: c[2], finRec: c[3], insight: c[4] }))
  .finally(() => prisma.\$disconnect());
"
```

**Atteso**: `user: 1, org: 1, member: 1, financialRecord: 922, insight: 6`.

**Fallback critico**: se i conteggi NON corrispondono, restore da backup:

```bash
cp prisma/dev.db.before-fase-d-20260526-213932 prisma/dev.db
```

Poi ri-eseguire `npx prisma migrate deploy` per riapplicare FASE D sullo schema restaurato.

---

## FASE 2 — Verifica FASE D Auth: file esistenti (20 min)

### Step 2.1 — File chiave devono esistere

```bash
ls -la \
  src/auth.ts \
  src/auth.config.ts \
  src/middleware.ts \
  src/lib/auth/config.ts \
  src/lib/auth/tokens.ts \
  src/types/next-auth.d.ts
ls prisma/migrations/ | grep fase_d
```

**Atteso**: tutti i file presenti senza errori, migration
`20260526214153_fase_d_auth_complete` listata.

**Fallback se mancano**: la FASE D potrebbe essere stata allucinata in modalità cieca.
Rifare FASE D completa usando il prompt salvato dalla sessione del 2026-05-27.

### Step 2.2 — Dipendenze installate

```bash
grep -E "next-auth|@auth/prisma-adapter|bcryptjs|speakeasy|qrcode|jose" package.json
```

**Atteso**: 6 dipendenze presenti nel `package.json`.

**Fallback se mancano**:

```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs speakeasy qrcode jose
npm install --save-dev @types/bcryptjs @types/speakeasy @types/qrcode
```

### Step 2.3 — TypeScript clean

```bash
npx tsc --noEmit 2>&1 | head -50
```

**Atteso**: output vuoto o `Found 0 errors in X files`.

**Fallback se errori**: leggere ogni errore, fixare uno a uno. Probabile causa: import paths errati
o type declarations mancanti in `src/types/next-auth.d.ts`.

### Step 2.4 — Migration applicata in DB

```bash
npx prisma migrate status
```

**Atteso**: `Database schema is up to date!`

**Fallback se pending**:

```bash
npx prisma migrate deploy
```

---

## FASE 3 — Test runtime FASE D (45 min)

### Step 3.1 — Avvia dev server

```bash
pkill -9 -f next 2>/dev/null || true
sleep 5
rm -rf .next
PORT=3000 nohup npm run dev > /tmp/dev.log 2>&1 &
sleep 30
tail -30 /tmp/dev.log
```

**Atteso**: output contiene `▲ Next.js` + `Local: http://localhost:3000` + nessun errore visibile.

**Fallback se crash**: leggere `/tmp/dev.log` completo, identificare errore, fixare, riavviare.

### Step 3.2 — Smoke test routes pubbliche

```bash
for path in / /it /en /it/login /it/signup /it/forgot-password /it/pricing /it/legal/privacy; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "$code  $path"
done
```

**Atteso**: tutti 200 o 307 (redirect canonico locale).

**Fallback se 500**: il Button asChild fix potrebbe non essere applicato, o altro bug.
Controllare log server per stack trace esatto.

### Step 3.3 — Smoke test routes protette (no auth)

```bash
for path in /it/overview /it/finance /it/onboarding/organization /it/settings/security; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -L "http://localhost:3000$path")
  echo "$code  $path"
done
```

**Atteso**: tutti 307 (redirect a `/it/login`) — middleware di protezione attivo.

### Step 3.4 — Test API auth endpoints

```bash
# precheck deve rispondere
curl -s "http://localhost:3000/api/auth/precheck" \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}' | python3 -m json.tool

# register vuoto deve dare errore body validation
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:3000/api/auth/register" \
  -X POST -H "Content-Type: application/json" -d '{}'

# verify-email token invalido deve dare 400
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:3000/api/auth/verify-email?token=invalid_token_000"
```

**Atteso**: primo ritorna JSON con `status`, secondo 400, terzo 400.

### Step 3.5 — Test browser visual QA (CRITICO — annotare ogni step)

Aprire Codespace browser preview su porta 3000. Eseguire in ordine:

**A. Signup flow**
1. Apri `/it/signup`
2. Inserire email + password debole → deve mostrare validation error inline (non submit)
3. Inserire email valida + password forte (es. `Test@1234567890!`) → submit
4. Atteso: redirect a `/it/verify-email` con messaggio "controlla email"
5. Verificare email arrivata (check logs: `grep -i "verify\|email" /tmp/dev.log | tail -20`)

**B. Verify email**
1. Trovare token nei logs: `grep -o "token=[a-zA-Z0-9_-]*" /tmp/dev.log | tail -5`
2. Oppure query DB: `npx tsx -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findFirst({orderBy:{createdAt:'desc'},select:{emailVerifyToken:true}}).then(u=>console.log(u)).finally(()=>p.\$disconnect())"`
3. Aprire `/it/verify-email?token=TOKEN_TROVATO`
4. Atteso: redirect a `/it/welcome` con nome utente

**C. Onboarding wizard**
1. Deve iniziare automaticamente da `/it/onboarding/organization`
2. Step 1: inserire nome org + P.IVA opzionale → Next
3. Step 2: selezionare settore + dimensione team → Next
4. Step 3: skip data import → Next
5. Step 4: skip invite → Submit
6. Atteso: redirect a `/it/overview` con org name visibile in topbar

**D. Login flow**
1. Logout (click avatar → logout)
2. Aprire `/it/login`
3. Inserire credentials → submit
4. Atteso: redirect a `/it/overview`

**E. 2FA setup**
1. Navigare a `/it/settings/security`
2. Click "Configura 2FA" / "Setup 2FA"
3. Visualizzato QR code + secret testuale
4. Scansionare QR con Google Authenticator / Authy
5. Inserire codice TOTP a 6 cifre → conferma
6. Atteso: backup codes mostrati una sola volta
7. Copiare backup codes (o screenshot)

**F. Login con 2FA**
1. Logout
2. Login con email + password → atteso: richiesta codice TOTP
3. Inserire codice da app → atteso: redirect overview

**G. Password reset**
1. Logout
2. Aprire `/it/forgot-password` → inserire email
3. Trovare reset token nei logs
4. Aprire `/it/reset-password?token=RESET_TOKEN`
5. Inserire nuova password forte → submit
6. Login con nuova password → atteso: overview OK

**Annotare ogni lettera: ✅ OK oppure ❌ FAIL + dettaglio errore.**

---

## FASE 4 — Verifica file sessione cieca non-FASE-D (60 min)

### Step 4.1 — Verifica 4 documenti rotti confermati

```bash
wc -l README.md docs/SECURITY.md docs/DEPLOY.md docs/onboarding-flow.md
```

**Atteso se rotti**: tutti < 100 righe (stub vuoti o truncati).
**Atteso se OK**: README ~300+, SECURITY ~300+, DEPLOY ~350+, onboarding-flow ~550+.

**Action se rotti**: eseguire FASE 5 (rifare i 4 documenti).

### Step 4.2 — Verifica infrastruttura email

```bash
ls -la src/lib/email/
ls -la src/lib/email/templates/ 2>/dev/null || echo "templates/ missing"
```

**Atteso**: directory `templates/` con 9+ file (welcome, verify-email, password-reset,
team-invite, payment-confirmed, trial-3days, trial-1day, trial-expired, subscription-canceled).

**Test compilazione email**:

```bash
npx tsc --noEmit src/lib/email/*.ts src/lib/email/templates/*.ts 2>&1 | head -20
```

**Atteso**: 0 errori.

### Step 4.3 — Verifica componenti polish

```bash
git log --oneline --all | grep -iE "polish|ui fix|cleanup" | head -5
```

**Atteso**: commit polish visibili nella cronologia.

**Visual QA browser** (rapido — 15 min):
- Sidebar: voce attiva evidenziata, hover states funzionanti
- Topbar: OrgSwitcher visibile se multi-org, backdrop-blur attivo
- KPI Card: hover shadow funzionante
- Insight Card: bordo sinistro colorato + hover lift
- Pagina 404: ErrorState full-page ben formattata
- Toast: stile sonner consistente con design system
- Dialog: overlay blur-md presente
- Form inputs: stile consistente (input, select, textarea)

### Step 4.4 — Verifica Schema.org JSON-LD

```bash
curl -s http://localhost:3000/it | grep -o "application/ld+json" | wc -l
```

**Atteso**: >= 1 occorrenza per pagina (Organization + WebSite schema iniettati).

### Step 4.5 — Verifica SEO infrastruttura

```bash
curl -s http://localhost:3000/robots.txt | head -15
echo "---"
curl -s http://localhost:3000/sitemap.xml | head -15
```

**Atteso**: contenuto valido in entrambi (non 404, non HTML error page).

### Step 4.6 — Lint clean

```bash
npm run lint 2>&1 | tail -20
```

**Atteso**: `✓ No ESLint warnings or errors` o output vuoto.

**Fallback se errori**: fixare lint errors (spesso `any` non tipizzati o import non usati).

---

## FASE 5 — Rifare 4 documenti rotti (90 min)

**Ordine di priorità** (per impatto operativo decrescente):

### 5.1 — docs/DEPLOY.md (~357 righe target)

Documento operativo per deploy su Vercel + Supabase + DNS. Critico per prossimo deploy.

Sezioni necessarie:
- Pre-requisiti (Vercel CLI, Supabase CLI, accesso DNS)
- Setup Supabase production (nuovo progetto, migrate, seed)
- Setup Vercel project (env vars, domains, crons)
- DNS GoDaddy → anlyra.it (record A, CNAME, MX)
- Checklist go-live (10 items)
- Rollback procedure

### 5.2 — docs/SECURITY.md (~338 righe target)

Documento security disclosure + enterprise trust. Impatta sales enterprise.

Sezioni necessarie:
- Responsible disclosure policy
- Scope e out-of-scope
- Come riportare vulnerabilità
- SLA risposta (24h ack, 7gg fix)
- Hall of fame (futuro)
- Security measures overview (link a security-audit-checklist.md)

### 5.3 — docs/onboarding-flow.md (~570 righe target)

Blueprint completo del wizard onboarding (FASE D già implementato). Utile come riferimento.

Sezioni necessarie:
- Overview flow (4 step + verify email + welcome)
- Step 1: dati organizzazione (nome, P.IVA, settore, dimensione)
- Step 2: import dati (skip opzionale)
- Step 3: invite team (skip opzionale)
- Step 4: welcome + CTA overview
- Error states e recovery
- Multi-org: creazione seconda org
- API contract (endpoint, payload, response)

### 5.4 — README.md (~305 righe target)

Prima impressione GitHub. Impatta credibilità e recruiting.

Sezioni necessarie:
- Badge (build, license, version)
- Hero: cos'è Anlyra (1 paragrafo)
- Features principali (6-8 bullet)
- Screenshot placeholder
- Tech stack (Next.js 14, NextAuth v5, Prisma, Supabase, Anthropic)
- Quick start (clone, env, dev)
- Deploy su Vercel (1-click badge)
- Contributing link
- License

**Procedura per ognuno**:
1. Aprire Claude Code (Codespace online)
2. Lanciare prompt di rigenerazione documento
3. Verificare numero righe corretto
4. Visual check su GitHub rendered view
5. Annotare ✅ completo

---

## FASE 6 — Aggiornamento CLAUDE.md (30 min)

Aggiornare le seguenti sezioni di `CLAUDE.md`:

### Debiti tecnici chiusi pre-offline (aggiungere)

```
- [x] DEBITO 14 — Plans cleanup (SHA c052295)
- [x] DEBITO 5 — Credits unification (SHA f49bcea)
- [x] DEBITO 7 — Alert_b7 rename (SHA d68f986)
- [x] DEBITO 8 — Insight cleanup (SHA 09169aa)
```

### Sessione cieca giorno 4 — risultati (aggiungere)

```
Sessione cieca 2026-05-27 (Codespace offline):
- ~85 file modificati, ~7500 righe aggiunte, 22+ SHA
- FASE D Auth: NextAuth v5 + multi-org Membership + 2FA TOTP + onboarding wizard + invite flow
- Button asChild fix: React.Children.only crash risolto
- Docs strategici: security-audit-checklist (51 items), codespace-recovery-procedure
- 4 documenti identificati come rotti (DEPLOY, SECURITY, onboarding-flow, README)
  → rifatti durante recovery (FASE 5)
```

### Lessons learned (aggiungere #17 e #18)

```
#17 — Clipboard truncation: UI Anthropic può spezzare prompts > 2000 righe.
     Mitigation: split prompt in 3-4 messaggi separati, confermare ricezione.

#18 — Shell ambiguity in modalità cieca: Opus può affermare capacità shell
     senza poterle verificare. Lesson: modalità "Markdown-only ciechi" è sicura;
     modalità "Codespace required" va riservata a Codespace online confermato.
```

### Stato progetto corrente (aggiornare)

```
- [x] Design system v2 completo (5/5 fasi)
- [x] Sito pubblico funzionante (post Button fix)
- [x] AI insights generation funzionante
- [x] FASE D Auth: NextAuth v5 + 2FA + onboarding + multi-org (verificato post-recovery)
- [x] Docs strategici: ~32 documenti
- [ ] Security audit 51 items: da eseguire
- [ ] OAuth production setup: dopo security audit green
- [ ] Stripe live: dopo security audit green
- [ ] Deploy production: dopo tutto sopra
```

---

## FASE 7 — Decisioni strategiche in attesa (libero)

Queste decisioni richiedono input founder e non hanno deadline tecnica immediata.

### Pricing finale

- Documento: `docs/decisions/credit-pack-pricing.md`
- Requisiti prima di decidere:
  - Customer interviews: 5-10 prospect (domande: budget, willingness-to-pay, competitor)
  - Benchmark competitor: prezzi Fathom, Peel, Metorik
  - Unit economics: costo Anthropic per insight, margine target
- Decisione stimata: 2-4 settimane post-beta

### Plan limits definitivi

- Pro: N utenti per org, M org per utente
- Avanzato: N utenti, M org
- Enterprise: unlimited
- Configurabili via env vars già predisposti (`PLAN_PRO_USERS_PER_ORG`, ecc.)

### OAuth providers production

Solo dopo security audit checklist 51 items **tutti verdi**:
1. Google Cloud Console → creare progetto `Anlyra Production`
2. Configurare OAuth consent screen (logo, privacy policy URL, TOS URL)
3. Creare credentials → CLIENT_ID + CLIENT_SECRET
4. Microsoft Azure → creare App Registration `Anlyra`
5. Configurare redirect URIs
6. Set env vars su Vercel: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_MICROSOFT_ENTRA_ID`, ecc.

### Deploy production

Solo dopo: OAuth ✅ + Stripe live ✅ + Resend prod ✅ + Sentry ✅ + security audit ✅:
1. Setup Supabase production project
2. `npx prisma migrate deploy` su production DB
3. Setup Vercel production project (env vars, domain)
4. DNS GoDaddy → anlyra.it
5. Test E2E completo su staging
6. Go-live announcement (newsletter, LinkedIn, Product Hunt)

---

## Stima tempi totali

| Fase | Attività | Tempo stimato |
|---|---|---|
| 1 | Verifica integrità repository | 15 min |
| 2 | Verifica FASE D files | 20 min |
| 3 | Test runtime FASE D | 45 min |
| 4 | Verifica sessione cieca non-FASE-D | 60 min |
| 5 | Rifare 4 documenti rotti | 90 min |
| 6 | CLAUDE.md update | 30 min |
| 7 | Decisioni strategiche | libero |
| **Totale bloccante** | | **4-5 ore** |

---

## Criteri di successo — recovery completo

- [ ] Git: HEAD allineato a `claude/merge-repos-nextjs-rOZU3`
- [ ] DB: 1 user, 1 org, 1 member, 922 financialRecords, 6 insights
- [ ] FASE D: tutti i file src/auth.ts, auth.config.ts, middleware.ts, ecc. presenti
- [ ] TypeScript: `npx tsc --noEmit` → 0 errori
- [ ] Migration: `npx prisma migrate status` → up to date
- [ ] Runtime: signup → verify → onboarding → login → 2FA → reset password: tutti ✅ E2E
- [ ] Routes pubbliche: `/it`, `/en`, `/it/pricing` → 200
- [ ] Routes protette: redirect a login quando non autenticato
- [ ] 4 documenti rotti: rifatti e completi
- [ ] CLAUDE.md: aggiornato con sessione cieca + lessons learned

**Quando tutti 10 criteri ✅: recovery completato.**
**Next step**: eseguire security audit checklist 51 items → poi OAuth setup → poi deploy production.

---

**Status**: operativo.  
**Last updated**: 2026-05-27.  
**Da seguire**: appena Codespace `cautious-funicular-qwvw4x969rp3xqp4` torna online.
