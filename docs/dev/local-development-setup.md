---
title: Anlyra · Local Development Setup
audience: developer (onboarding nuovo dev)
status: operativo
last_updated: 2026-05-27
---

# Local Development Setup

> Guida passo-passo per avere l'ambiente di sviluppo Anlyra funzionante in locale.

**Documenti correlati**: [`coding-standards.md`](coding-standards.md),
[`git-workflow.md`](git-workflow.md), [`../codespace-recovery-procedure.md`](../codespace-recovery-procedure.md).

---

## 1. Pre-requisiti

| Tool | Versione minima | Installazione |
|---|---|---|
| Node.js | 22.x LTS | [nodejs.org](https://nodejs.org) o `nvm install 22` |
| npm | 9.x | Incluso con Node |
| Git | 2.40+ | [git-scm.com](https://git-scm.com) |
| VS Code | raccomandato | [code.visualstudio.com](https://code.visualstudio.com) |

Verifica:
```bash
node --version   # v22.x.x
npm --version    # 9.x.x o 10.x.x
git --version    # 2.40+
```

---

## 2. Clone del repository

```bash
git clone https://github.com/CNAYAZ/Anlyra.git
cd Anlyra
git checkout claude/merge-repos-nextjs-rOZU3
```

---

## 3. Installazione dipendenze

```bash
npm ci
```

Usare sempre `npm ci` (deterministico, usa `package-lock.json`) invece di `npm install`.

---

## 4. Configurazione `.env.local`

```bash
cp .env.example .env.local
```

Aprire `.env.local` e compilare i valori di sviluppo:

```bash
# Database (SQLite locale)
DATABASE_URL="file:./dev.db"

# NextAuth
AUTH_SECRET="dev-secret-almeno-32-caratteri-random"
AUTH_URL="http://localhost:3000"
# NOTA: Google/Microsoft OAuth opzionali in dev (lasciare vuoti per usare solo email/password)
# AUTH_GOOGLE_ID=""
# AUTH_GOOGLE_SECRET=""

# Anthropic (richiesto per AI insights)
ANTHROPIC_API_KEY="sk-ant-..."  # ottenere da console.anthropic.com

# Email (Resend — usare test key in dev)
RESEND_API_KEY="re_test_..."    # key test non invia email reali
FROM_EMAIL="noreply@anlyra.it"

# Stripe (test mode)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cron (lasciare vuoto in dev — nessuna auth)
# CRON_SECRET=""

# Plan limits (default da env vars)
# PLAN_PRO_USERS_PER_ORG=3
# PLAN_ADVANCED_USERS_PER_ORG=10
```

---

## 5. Setup database

```bash
# Applica migration e crea DB SQLite locale
npx prisma migrate deploy

# Seed con dati demo (1 user, 1 org, 922 financial records, 6 insights)
npx prisma db seed
```

Verifica:
```bash
npx prisma studio   # apre GUI DB su http://localhost:5555
```

---

## 6. Avvio dev server

```bash
npm run dev
```

L'app è disponibile su `http://localhost:3000`.

**Credenziali demo** (post-seed):
- Email: `demo@anlyra.it`
- Password: `DemoPassword123!`

---

## 7. Comandi utili

```bash
npm run dev          # dev server con hot reload
npm run build        # build production locale
npm run start        # avvio build production locale
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript check
npx prisma studio    # GUI database
npx prisma migrate dev --name nome_migration  # crea nuova migration (interattivo)
```

---

## 8. Troubleshooting comuni

| Problema | Soluzione |
|---|---|
| `Module not found: @/...` | Verificare `tsconfig.json` paths; `npm ci` |
| `Cannot find module 'next-auth'` | `npm ci`; verifica `package-lock.json` è aggiornato |
| Port 3000 già in uso | `pkill -9 -f next` oppure `PORT=3001 npm run dev` |
| Prisma schema sync error | `npx prisma generate` poi `npx prisma migrate deploy` |
| Auth loop redirect | Cancella cookies localhost, verifica `AUTH_URL=http://localhost:3000` |
| `ANTHROPIC_API_KEY` mancante | AI insights non funziona; aggiungere chiave valida a `.env.local` |

---

**Status**: operativo.  
**Last updated**: 2026-05-27.
