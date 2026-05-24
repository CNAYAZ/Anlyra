# SEO Checklist Anlyra

## File generati automaticamente da Next.js App Router

| File generato | Sorgente |
|---|---|
| `/robots.txt` | `src/app/robots.ts` |
| `/sitemap.xml` | `src/app/sitemap.ts` |
| `/opengraph-image.png` | `src/app/opengraph-image.tsx` (edge runtime) |

Questi file sono **route speciali di Next.js** — non richiedono configurazione aggiuntiva e vengono generati automaticamente al build.

## File asset da creare manualmente

I file immagine non possono essere generati via codice senza design assets. Crearli manualmente prima del deploy in produzione:

| File | Dimensioni | Uso |
|---|---|---|
| `src/app/icon.png` | 32×32 px | Favicon browser tab |
| `src/app/apple-icon.png` | 180×180 px | iOS home screen icon |
| `src/app/icon.svg` | vettoriale | Favicon scalabile (alternativa PNG) |

> `opengraph-image.tsx` genera già l'immagine OG programmaticamente via `next/og` — nessun PNG esterno necessario.

## Pagine indicizzabili (robots.ts)

| Percorso | Locales | Note |
|---|---|---|
| `/it`, `/en` | entrambi | Landing page — priorità 1.0 |
| `/it/pricing`, `/en/pricing` | entrambi | Pagina prezzi — priorità 0.9 |
| `/it/login`, `/en/login` | entrambi | Entry point brand — priorità 0.6 |
| `/it/legal/*`, `/en/legal/*` | entrambi | Privacy, Terms, Cookies — priorità 0.4–0.5 |

## Pagine bloccate all'indicizzazione

Tutte le route della dashboard privata (`(dashboard)` group layout):

`overview`, `ai`, `finance`, `operations`, `market`, `settings`, `custom-dashboards`, `integrations`, `reports`, `data`, `share`, `onboarding`

Bloccate anche: `/api/`, `/_next/`, `/static/`

## AI crawlers bloccati

| Bot | Operatore | Motivazione |
|---|---|---|
| `GPTBot` | OpenAI | Training data LLM |
| `CCBot` | Common Crawl | Alimenta molti LLM open-source |
| `anthropic-ai` | Anthropic | Training data LLM |
| `ClaudeBot` | Anthropic | Web crawler Claude |

Anlyra non vuole che i contenuti del sito diventino training data per modelli AI di terze parti.

## Checklist pre-launch produzione

### Ambiente

- [ ] `NEXT_PUBLIC_SITE_URL=https://anlyra.it` settato in Vercel (o deployment env)
- [ ] Dominio `anlyra.it` verificato e DNS propagato
- [ ] Certificato SSL attivo (HTTPS obbligatorio per indicizzazione moderna)

### Verifica file SEO

- [ ] Visita `/robots.txt` — controlla che le disallow siano corrette
- [ ] Visita `/sitemap.xml` — verifica che tutte le 12 URL siano presenti (6 percorsi × 2 locales)
- [ ] Visita `/opengraph-image.png` — verifica che l'immagine venga generata correttamente

### Asset immagini

- [ ] `src/app/icon.png` creato (32×32, logo Anlyra, sfondo trasparente o panna)
- [ ] `src/app/apple-icon.png` creato (180×180, stessa icona)

### Preview social

- [ ] Test OG: [opengraph.xyz](https://opengraph.xyz) — inserire `https://anlyra.it`
- [ ] Test Twitter Card: [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator)
- [ ] Test LinkedIn: incollare URL su LinkedIn per vedere anteprima

### Search Console e Webmaster Tools

- [ ] Google Search Console: aggiungi proprietà `anlyra.it` e verifica ownership
- [ ] Submit sitemap: `https://anlyra.it/sitemap.xml` da GSC → Sitemaps
- [ ] Bing Webmaster Tools: aggiungi proprietà (import da Google SC è automatico)

### Performance e accessibilità

- [ ] PageSpeed Insights: [pagespeed.web.dev](https://pagespeed.web.dev) — target Core Web Vitals
- [ ] Mobile-friendly: [search.google.com/test/mobile-friendly](https://search.google.com/test/mobile-friendly)
- [ ] Verifica lingua `<html lang="it">` presente nel root layout

### Crawl audit (post-launch)

- [ ] Screaming Frog SEO Spider (gratis fino a 500 URL) — verifica redirect, 404, missing meta
- [ ] Attendi prima indicizzazione Google (1–7 giorni dopo submit sitemap)

## Note OG image

`src/app/opengraph-image.tsx` genera l'immagine via `next/og` con:
- Background: gradient panna `#F9F4EB → #E4D9C4`
- Barra decorativa sage `#5B6F4E` in cima
- Logo "A" quadrato sage + wordmark "Anlyra"
- Headline: "Analytics AI per PMI italiane."
- Tag: "Privacy seria, sul serio." su sfondo sage

Per modificare il design OG, editare `src/app/opengraph-image.tsx` — nessun PNG da rigenerare manualmente.

## hreflang e internazionalizzazione

Il root layout imposta:
```
alternates.languages = { 'it-IT': '/it', 'en-US': '/en' }
```

La sitemap include `alternates.languages` per ogni entry con tutti i locales disponibili.

Questo permette a Google di servire la versione linguistica corretta in base alla geo/lingua dell'utente.
