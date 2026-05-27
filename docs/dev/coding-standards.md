---
title: Anlyra · Coding Standards
audience: developer
status: operativo
last_updated: 2026-05-27
---

# Coding Standards

> Standard di codice per il progetto Anlyra. Questi standard sono **operativi** e si applicano a
> tutto il codice committato su `claude/merge-repos-nextjs-rOZU3`.

**Documenti correlati**: [`git-workflow.md`](git-workflow.md),
[`local-development-setup.md`](local-development-setup.md),
[`deployment-runbook.md`](deployment-runbook.md).

---

## 1. TypeScript

- **Strict mode**: sempre. `tsconfig.json` ha `"strict": true`.
- **No `any`**: ogni `any` richiede commento che giustifica il perché.
- **Type-first**: tipi espliciti sulle funzioni pubbliche; inference dove ovvio.
- **Null safety**: preferire `undefined` a `null`; gestire entrambi esplicitamente.
- **`npx tsc --noEmit`** deve essere pulito prima di ogni commit.

---

## 2. File naming

| Tipo | Convenzione | Esempio |
|---|---|---|
| Componente React | PascalCase | `UserMenu.tsx` |
| Hook | camelCase con `use` prefix | `useCurrentOrg.ts` |
| Utility / lib | kebab-case | `token-utils.ts` |
| Route (Next.js) | `route.ts` o `page.tsx` | `route.ts` |
| Tipo / schema | kebab-case | `user-schema.ts` |
| Test | stessa convenzione + `.test` | `token-utils.test.ts` |
| Constanti | SCREAMING_SNAKE_CASE | `MAX_RETRY = 3` |

---

## 3. Folder structure

```
src/
  app/                  # Next.js App Router — route handlers + pages
  components/
    ui/                 # Componenti UI riusabili (Button, Input, ecc.)
    dashboard/          # Componenti specifici della dashboard
    [feature]/          # Componenti specifici di feature
  lib/
    auth/               # Helpers autenticazione
    ai/                 # Integrazione Anthropic
    email/              # Templates e invio email
    cron/               # Job schedulati
  types/                # Dichiarazioni TypeScript globali
  i18n/                 # Configurazione next-intl
```

---

## 4. Import order

1. External deps (`react`, `next`, librerie npm)
2. Internal aliases (`@/lib/...`, `@/components/...`)
3. Relative imports (`./button`, `../utils`)

Riga vuota tra ogni gruppo. ESLint `import/order` enforca automaticamente.

---

## 5. Error handling

- **API routes**: sempre restituire `NextResponse.json({ error: 'ERROR_CODE' }, { status: N })`.
- **Codici errore**: stringa SCREAMING_SNAKE_CASE (`UNAUTHORIZED`, `NOT_FOUND`, `INVALID_BODY`).
- **try/catch**: catturare errori specifici; non swallare silenziosamente senza log.
- **Best-effort operations** (email, webhook): `.catch(() => {})` con commento che spiega perché.
- **Never throw strings**: sempre `throw new Error('message')`.

---

## 6. Async/await

- Preferire `async/await` a `.then()/.catch()` per leggibilità.
- **No `await` in loop**: usare `Promise.all()` per operazioni parallele.
- `Promise.allSettled()` per operazioni indipendenti dove i fallimenti parziali sono accettabili.

---

## 7. No `console.log` in produzione

- **Vietato** `console.log` committato, salvo debug temporaneo marcato con `// TODO: remove`.
- Usare il logger strutturato di progetto (o `console.error` solo per errori inattesi).
- Il linter segnala `console.log` come warning.

---

## 8. Commenti

- **Nessun commento** per codice auto-esplicativo.
- Commento solo quando il **perché** è non ovvio: constraint nascosto, workaround specifico,
  invariante sottile.
- Non commentare il "cosa" — i nomi dei simboli lo descrivono già.
- No docstring multi-riga sulle funzioni; una riga max se serve.

---

## 9. Componenti React

- Preferire function components con arrow functions.
- Props: interface esplicita, no inline type literal per props complesse.
- `'use client'` solo dove necessario; preferire server components.
- `React.forwardRef` per componenti che espongono ref al DOM.
- No prop drilling oltre 2 livelli: usare context o composizione.

---

## 10. Prisma

- Mai `$queryRaw` con interpolazione di stringhe — sempre parametri typed.
- Usare `$transaction` per operazioni che devono essere atomiche.
- Selezionare solo i campi necessari (`select: {}`) per evitare over-fetch.
- Non usare modelli zombie (`User_b4`, `Organization_b7`, ecc.) in query nuove.

---

**Status**: operativo.  
**Last updated**: 2026-05-27.
