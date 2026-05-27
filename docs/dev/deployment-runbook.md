---
title: Anlyra · Deployment Runbook
audience: developer / founder (deploy production)
status: operativo
last_updated: 2026-05-27
---

# Deployment Runbook

> Procedura passo-passo per deploy production su Vercel + Supabase. Seguire **in ordine**;
> ogni step ha criteri di successo.

**Documenti correlati**: [`../DEPLOY.md`](../../DEPLOY.md),
[`../security-audit-checklist.md`](../security-audit-checklist.md),
[`git-workflow.md`](git-workflow.md), [`../codespace-recovery-procedure.md`](../codespace-recovery-procedure.md).

**Pre-condizione**: security audit checklist 51 items tutti ✅ prima del primo deploy production.

---

## FASE 0 — Gate pre-deploy

Nessun deploy se uno di questi fallisce:

- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run lint` → 0 errori
- [ ] Test smoke locali passano (vedi FASE 1)
- [ ] `git status` pulito su `claude/merge-repos-nextjs-rOZU3`
- [ ] Tutte le env vars production configurate su Vercel

---

## FASE 1 — Smoke test locale pre-deploy

```bash
pkill -9 -f next || true && sleep 3
rm -rf .next
npm run build 2>&1 | tail -20
```

**Atteso**: build succeeds, `Route (app)` table senza errori.

```bash
PORT=3000 nohup npm run start > /tmp/prod-test.log 2>&1 &
sleep 15
for path in / /it /en /it/login /it/signup /it/pricing; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "$code  $path"
done
```

**Atteso**: tutti 200 o 307.

---

## FASE 2 — Deploy su Vercel (preview)

```bash
vercel --prod=false
```

Oppure via GitHub: push al branch trigger preview deployment automatico.

**Verifiche preview**:
- URL preview da Vercel dashboard
- Smoke test sulle stesse route
- Controllare Vercel Function logs per errori

---

## FASE 3 — Deploy su Vercel (staging)

- Setup: Vercel environment `preview` punta a Supabase staging DB (separato da production).
- Eseguire test E2E su staging se disponibili.
- Checklist staging:
  - [ ] Login funziona
  - [ ] Signup + verify email funziona
  - [ ] Stripe test mode checkout funziona
  - [ ] AI insight generato correttamente

---

## FASE 4 — Database migration production

```bash
# Da eseguire UNA SOLA VOLTA per ogni migration nuova
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

**Attenzione**: `migrate deploy` è irreversibile. Verificare la migration su staging prima.

---

## FASE 5 — Deploy production

```bash
vercel --prod
```

Oppure via Vercel dashboard: promuovi il deployment preview a production.

---

## FASE 6 — Smoke test production

```bash
PROD_URL="https://anlyra.it"
for path in / /it /en /it/login /it/signup /it/pricing /api/health; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}${path}")
  echo "$code  ${PROD_URL}${path}"
done
```

**Atteso**: tutti 200 o 307.

Test manuale browser (5 min):
- [ ] Homepage carica correttamente
- [ ] Login con account test funziona
- [ ] Nessun errore console JavaScript

---

## FASE 7 — Post-deploy monitoring (1 ora)

- Monitorare Sentry per nuovi errori.
- Controllare Vercel logs per anomalie.
- Verificare uptime monitor (Better Stack / UptimeRobot).
- Verificare che il cron trial-check sia schedulato.

---

## Rollback procedure

Se il deploy production causa problemi:

```bash
# Via Vercel dashboard: "Instant Rollback" al deployment precedente
# Oppure CLI:
vercel rollback [deployment-url]
```

**Rollback DB**: solo se la migration ha causato problemi (raro). Richiede backup pre-migration.
Contattare Supabase support per point-in-time recovery se necessario.

---

## Env vars checklist production

| Variabile | Dove ottenerla |
|---|---|
| `DATABASE_URL` | Supabase → Settings → Database |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://anlyra.it` |
| `AUTH_GOOGLE_ID/SECRET` | Google Cloud Console |
| `AUTH_MICROSOFT_ENTRA_ID/...` | Azure Portal |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks |
| `ANTHROPIC_API_KEY` | Anthropic Console |
| `RESEND_API_KEY` | Resend Dashboard |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://anlyra.it` |

---

**Status**: operativo (da eseguire al primo deploy production).  
**Last updated**: 2026-05-27.
