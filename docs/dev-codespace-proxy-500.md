# Dev 500 dietro proxy Codespace — root cause e fix (chiuso)

> Riferimento permanente per il bug "Internal Server Error nel browser via proxy
> Codespace, ma `curl localhost` funziona". Diagnosi completata il 2026-06-09.
> Fix: **non settare `AUTH_URL`/`NEXTAUTH_URL` in sviluppo** (vedi §Fix).

## Sintomo

- Browser via proxy GitHub Codespaces (`*.app.github.dev`) → `Internal Server Error`
  su qualunque pagina (`/it`, `/en`, `/it/login`, ...) dopo ~30 secondi.
- `curl http://localhost:3000/it` → 200 immediato.
- Log dev server: `Failed to proxy http://localhost:3000/it Error: socket hang up`
  (`ECONNRESET`), poi `Compiling /_error`.
- Repro deterministica: il solo header `X-Forwarded-Proto: https` (che il proxy
  Codespace aggiunge sempre) trasforma la stessa richiesta da 200 a 500/30s.
- Le route `/api/*` non sono mai affette (il matcher del middleware le esclude).

## Root cause (tre attori)

1. **next-auth v5 `reqWithEnvURL`** — `node_modules/next-auth/lib/env.js:5-12`.
   Se `AUTH_URL` (o `NEXTAUTH_URL`) è settata, il wrapper `auth()` del middleware
   sostituisce l'origin di `req.nextUrl` con quello della env:
   `href.replace(origin, envOrigin)`. Con `AUTH_URL=http://localhost:3000`,
   il middleware lavora SEMPRE su `http://localhost:3000`, qualunque cosa dica
   la richiesta reale.

2. **next-intl middleware** — risponde a ogni richiesta pagina con un header
   `x-middleware-rewrite` costruito da `req.nextUrl`, quindi (per via del punto 1)
   con origin fisso `http://localhost:3000`.

3. **Next.js 14.2 dev router** — `node_modules/next/dist/server/lib/router-utils/resolve-routes.js`:
   - riga 99: `protocol = socket.encrypted || x-forwarded-proto includes https ? "https" : "http"`
   - riga 101: `initUrl = `${protocol}://${hostname}:${port}${req.url}``
   - righe 400-412: il valore di `x-middleware-rewrite` passa per
     `relativizeURL(value, initUrl)` (`shared/lib/router/utils/relativize-url.js`,
     confronto su `protocol + host`); se NON combacia resta assoluto e
     `parsedUrl.protocol` truthy → il rewrite è trattato come **destinazione
     esterna** → `proxyRequest` (`router-utils/proxy-request.js`, timeout 30s,
     riga 31; log `Failed to proxy`, riga 72).

### La catena con il proxy Codespace

```
Browser → proxy GitHub (aggiunge X-Forwarded-Proto: https) → next dev :3000
  initUrl  = https://localhost:3000/it     (riga 99: protocol da xfp)
  rewrite  = http://localhost:3000/it      (origin forzato da AUTH_URL)
  relativizeURL: https://... ≠ http://...  → resta assoluto
  → trattato come rewrite ESTERNO → proxyRequest verso http://localhost:3000/it
  → cioè VERSO SE STESSO, header xfp incluso → loop ricorsivo
  → 30s proxyTimeout → ECONNRESET → 500
```

Senza l'header (curl semplice) `initUrl` è `http://...` → combacia col rewrite →
tutto interno → 200. Per questo il bug sembrava "il browser è rotto, curl no".

`X-Forwarded-Host` da solo non innesca nulla: non entra né in `initUrl`
(che usa hostname/port di bind) né nel rewrite (origin fissato da `AUTH_URL`).

## Fix

**Rimuovere `AUTH_URL` e `NEXTAUTH_URL` da `.env.local` in sviluppo.**
Tenere `AUTH_TRUST_HOST=true`.

- Senza le due env, `reqWithEnvURL` è un no-op e il middleware usa l'URL reale
  della richiesta, che il dev server costruisce con lo stesso protocol di
  `initUrl` (`next-server.js:1035` usa `initProtocol`, anch'esso xfp-aware):
  rewrite e initUrl combaciano **per costruzione**, con e senza proxy davanti.
- `AUTH_TRUST_HOST=true` fa ricavare a NextAuth host/proto dagli header del
  proxy (`X-Forwarded-Host` / `X-Forwarded-Proto`) per i propri URL.
- Bonus: i redirect del middleware (es. `/it/overview` → login senza sessione)
  ora escono con `Location: /it/login` **relativa** (prima: assoluta
  `http://localhost:3000/...`, sbagliata dietro proxy).

Verifica eseguita (matrice completa, dev server 14.2.18):

| Test | Prima | Dopo |
|---|---|---|
| `curl /it` plain | 200 | 200 |
| `curl /it` con `X-Forwarded-Proto: https` | 500 in 30.0s | 200 in 0.07s |
| Tripletta proxy (Host+XFH+XFP) su `/it`, `/it/login`, `/it/signup`, `/it/welcome` | 500/timeout | 200 |
| Tripletta su `/it/overview` senza sessione | 307 Location assoluta | 307 `Location: /it/login` relativa |
| `/api/auth/{session,providers,csrf}` con tripletta | 200 | 200 |
| `npx tsc --noEmit` | 0 errori | 0 errori |

## Cosa NON è stato il problema (piste chiuse)

- `AUTH_TRUST_HOST` mancante: era già presente; necessario ma non sufficiente.
- Header overflow (`--max-http-header-size`): fix utile e mantenuto nello
  script `dev`, ma il loop non dipendeva da quello.
- Upgrade Next 14.2.18 → 14.2.35: diff verificato sui tre file coinvolti
  (`resolve-routes.js`, `relativize-url.js`, `proxy-request.js`):
  la logica protocol/rewrite è IDENTICA; l'upgrade non risolve.
- Reverse-proxy locale che strippa `X-Forwarded-Proto`: funzionerebbe, ma è
  stato scartato perché con la rimozione di `AUTH_URL` il problema sparisce
  senza componenti aggiuntivi.

## In produzione

Su Vercel (o `next start` dietro proxy gestito) il problema non si pone nei
termini di sviluppo; se serve un URL canonico esplicito usare
`AUTH_URL=https://anlyra.it` SOLO in produzione. In dev resta vietata.

Cross-ref: [`docs/SECURITY.md`](SECURITY.md), [`.env.example`](../.env.example),
[`docs/codespace-recovery-procedure.md`](codespace-recovery-procedure.md).
