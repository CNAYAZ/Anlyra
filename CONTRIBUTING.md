# Contributing to Anlyra

Grazie per l'interesse a contribuire. Questo documento spiega come farlo nel modo più efficiente.

---

## Prima di iniziare

- Apri prima una **issue** per discutere la modifica proposta. Le PR non annunciate su funzionalità grandi rischiano di essere chiuse.
- Per bug fix evidenti o typo, puoi aprire direttamente una PR.
- Leggi il [Code of Conduct](CODE_OF_CONDUCT.md) e il [README](README.md).

---

## Setup locale

```bash
git clone https://github.com/cnayaz/anlyra.git
cd anlyra
cp .env.example .env.local   # compila le variabili
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

L'app gira su `http://localhost:3000`. Per la demo, usa il pulsante **"Accedi alla demo"** nella pagina di login — nessuna password richiesta.

---

## Workflow Git

```
main (stabile, non toccare direttamente)
  └── claude/merge-repos-nextjs-rOZU3 (integration branch)
        └── claude/feature-name (feature branch)
```

1. Crea un branch da `claude/merge-repos-nextjs-rOZU3`:
   ```bash
   git checkout claude/merge-repos-nextjs-rOZU3
   git pull origin claude/merge-repos-nextjs-rOZU3
   git checkout -b claude/my-feature
   ```
2. Commit con messaggi chiari e descrittivi.
3. Apri una PR verso `claude/merge-repos-nextjs-rOZU3` (non verso `main`).
4. La PR viene mergiata con `--no-ff` per preservare la storia.

---

## Standard di codice

### TypeScript
- Nessun `any` esplicito senza commento che spiega il perché.
- Preferire tipi espliciti su `interface` piuttosto che `type` alias per oggetti.
- Nessun import da `next-auth` o `@auth/*` — l'app usa cookie custom `pro_session`.

### React / Next.js
- App Router con `src/` prefix. Nessun `pages/`.
- I18n via next-intl — ogni testo visibile all'utente deve passare da `useTranslations()` o `getTranslations()`.
- Logout **sempre** via reload assoluto: `window.location.href = '/api/auth/logout'`. Mai `router.push` per il logout.

### Styling
- Tailwind CSS + shadcn/ui. Non rinominare i token CSS custom esistenti (`--background`, `--foreground`, `--card`, ecc).
- Tabular nums obbligatori su ogni numero visualizzato: `font-variant-numeric: tabular-nums`.
- Nessuna emoji nella UI di prodotto.

### Database
- Prisma ORM. Non usare i modelli zombie (`User_b4`, `Organization_b7`, ecc) in query nuove.
- Non rimuovere i modelli zombie dalle migration — esistono per ragioni di compatibilità.

### Commenti
- Nessun commento se il codice è auto-esplicativo.
- Un commento solo quando il "perché" è non ovvio: vincoli nascosti, workaround, invarianti sottili.

---

## Linting e type check

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
```

Entrambi devono passare prima di ogni PR. I warning ESLint bloccano il merge.

---

## Test

```bash
npm run test        # Vitest unit
npm run test:e2e    # Playwright (pianificato Q3 2026)
```

Vedi [TESTING.md](docs/TESTING.md) per la strategia completa e i 12 scenari E2E critici.

---

## Sicurezza

- **Non committare segreti.** Le chiavi vanno in `.env.local` (gitignored).
- Leggi [SECURITY.md](docs/SECURITY.md) per la disclosure policy.
- Per segnalare una vulnerabilità: `security@anlyra.it` (non aprire issue pubbliche).

---

## PR checklist

Prima di chiedere review, verifica:

- [ ] `npm run lint` passa senza warning
- [ ] `npm run typecheck` passa
- [ ] Nessun segreto committato
- [ ] i18n: ogni nuovo testo ha chiave in entrambe le locale (`it`, `en`)
- [ ] Changelog aggiornato se la modifica è rilevante per gli utenti
- [ ] Screenshot/video allegato se la modifica tocca la UI

---

## Contatti

Domande sul processo? Apri una [discussione](https://github.com/cnayaz/anlyra/discussions) o scrivici a `hello@anlyra.it`.
