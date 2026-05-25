# Testing

> Strategia di test per Anlyra. Cosa testare, come, e quando.

**Stato attuale**: la suite E2E automatizzata è **pianificata** (roadmap Q3 2026, vedi [`roadmap.md`](roadmap.md)). Oggi i test sono prevalentemente manuali + typecheck/lint. Questo documento definisce il target.

Documenti correlati: [`DEPLOY.md`](DEPLOY.md) (deploy gates), [`SECURITY.md`](SECURITY.md) (security testing).

---

## 1. Test strategy overview

| Livello | Cosa copre | Stato | Tool target |
|---------|-----------|-------|-------------|
| Static | Tipi, lint | ✅ Attivo | `tsc --noEmit`, ESLint |
| Unit | Funzioni pure (parsers, format, calcoli) | 🚧 Parziale | Vitest |
| Integration | API route + DB | 🚧 Pianificato | Vitest + Prisma test DB |
| E2E | Flussi utente completi | 🚧 Pianificato | Playwright |
| Manual smoke | Sanity check pre/post deploy | ✅ Attivo | Checklist manuale |

Principio: **più un test è in alto nella piramide (E2E), più è costoso e fragile.** Massimizzare unit + integration, riservare E2E ai flussi critici di revenue e auth.

---

## 2. E2E test scenarios critici

I 12 flussi che NON possono rompersi. Ognuno è un test Playwright candidato.

1. **Signup completo**: landing → signup → email verify → welcome → primo insight generato.
2. **Login email/password**: credenziali valide → dashboard. Credenziali errate → errore chiaro.
3. **Login Google OAuth**: flusso OAuth → callback → sessione attiva. *(post-FASE D)*
4. **Logout**: reload assoluto via `/api/auth/logout`, sessione invalidata, redirect a login.
5. **Checkout Stripe**: pricing → checkout test mode → webhook ricevuto → email conferma → piano attivo.
6. **Cancel subscription**: portal Stripe → cancellazione → accesso mantenuto fino a fine periodo.
7. **Team invite**: invio invito → email ricevuta → accept → membership creata.
8. **Password reset**: richiesta → email con link → reset → login con nuova password.
9. **Import CSV**: upload → mapping colonne → commit → primo insight generato sui dati.
10. **2FA setup TOTP**: attivazione → scan QR → verifica codice → login successivo richiede 2FA.
11. **Org switch** *(Enterprise multi-org)*: cambio organizzazione → dati e dashboard aggiornati.
12. **Cancel account + GDPR export**: richiesta export → file generato → cancellazione account → dati rimossi.

Priorità di implementazione: **5, 1, 2, 4** per primi (revenue + auth), poi il resto.

---

## 3. Smoke test pre-deploy

10 URL che devono rispondere 200 (o redirect corretto) prima di ogni deploy:

1. `/` → 307 redirect a `/it`
2. `/it` (landing)
3. `/it/pricing`
4. `/it/login`
5. `/it/legal/privacy`
6. `/en` (landing EN)
7. `/api/health` *(da implementare)*
8. `/sitemap.xml`
9. `/robots.txt`
10. `/it/overview` → redirect a login se non autenticato

---

## 4. Regression test post-deploy

Visual QA manuale su 12+ pagine dopo ogni deploy in production:

- Landing (IT + EN)
- Pricing (toggle mensile/annuale)
- Login + signup
- Dashboard: Overview, Finance, AI Insights, AI Alerts, Operations, Market
- Settings: Profile, Team, Billing
- Una dashboard custom
- Mobile responsive check su almeno 2 pagine chiave

Cosa verificare: layout non rotto, tabular nums allineati, nessun testo non tradotto, nessun errore console.

---

## 5. Performance budgets

Target Core Web Vitals (mobile, 4G simulato):

| Metrica | Target | Limite |
|---------|--------|--------|
| LCP (Largest Contentful Paint) | < 2,0s | 2,5s |
| INP (Interaction to Next Paint) | < 150ms | 200ms |
| CLS (Cumulative Layout Shift) | < 0,05 | 0,1 |
| TTFB (Time To First Byte) | < 0,6s | 0,8s |

Misurare con Lighthouse CI in pipeline (pianificato) + PageSpeed Insights manuale sulle pagine pubbliche.

---

## 6. Browser support matrix

Supporto garantito sulle ultime 2 versioni di:

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari | ✅ | ✅ |
| Edge | ✅ | — |

Nessun supporto per Internet Explorer. Gli avvisi di browser obsoleto sono accettabili sotto queste soglie.

---

## 7. Accessibility test

Target: **WCAG 2.1 livello AA**.

- Tool automatico: `axe-core` integrato nei test E2E (pianificato).
- Check manuali: navigazione da tastiera, focus visibile, contrasto colori (palette panna+sage verificata in [`brand-guidelines.md`](brand-guidelines.md)), alt text immagini, label sui form.
- Screen reader spot-check su landing + flusso signup.

---

## 8. Security test

- **`npm audit`** settimanale + prima di ogni deploy. Vulnerabilità high/critical bloccano il deploy.
- **OWASP Top 10 checklist** rivista ad ogni feature che tocca auth, input utente o pagamenti. Dettagli in [`SECURITY.md`](SECURITY.md).
- **Dependency review** sui major version bump.
- **Secret scanning** attivo sul repo (no chiavi committate).

---

## 9. Integrazione TestSprite (placeholder)

Quando si integrerà TestSprite per il test automatizzato AI-driven:

1. Configurare il progetto puntando all'ambiente di staging.
2. Definire i 12 scenari E2E (§2) come test case TestSprite.
3. Eseguire la suite ad ogni PR verso `main`.
4. Bloccare il merge su fallimento dei flussi critici (revenue + auth).

*Workflow da dettagliare al momento dell'integrazione.*

---

## 10. Bug reporting template

```
**Titolo**: [breve descrizione]

**Severità**: P0 (blocca produzione) / P1 (grave) / P2 (medio) / P3 (minore)
  → vedi incident-response-playbook.md per le definizioni

**Ambiente**: production / staging / local
**Browser/OS**: [es. Chrome 130 / macOS]

**Passi per riprodurre**:
1.
2.
3.

**Comportamento atteso**:
**Comportamento osservato**:

**Screenshot/log**:
**Note**:
```

---

**Status**: living document. Aggiornato man mano che la suite automatizzata viene implementata.
