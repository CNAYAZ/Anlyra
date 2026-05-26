---
title: Anlyra · Cookie Consent UX
audience: product team, legal, frontend developer
last_updated: 2026-05-26
status: planning document
---

# Cookie Consent UX

> Specifica del flusso UX per il cookie consent banner di Anlyra. Conforme GDPR art. 4(11) e Linee Guida Garante italiano 2021.

**Correlati**: [`subprocessor-list.md`](subprocessor-list.md), [`privacy-dpia-template.md`](../privacy-dpia-template.md), `docs/legal/` (privacy policy).

---

## 1. Quando appare il banner

### Prima visita
Il banner appare **ad ogni prima visita** da dispositivo/browser non già consentito. Nessun tracking prima del consenso (esclusi cookie strettamente necessari).

### Re-consent
- Il consenso dura **6 mesi**. Dopo 6 mesi, il banner riappare per aggiornare il consenso.
- Il banner riappare anche se viene **aggiunta una nuova categoria** di cookie — il consenso precedente non copre categorie nuove.
- Il banner **non riappare** ad ogni visita se il consenso è già stato espresso e non è scaduto.

### Storage della decisione
- Cookie: `anlyra_consent_v1`
- Formato: JSON con struttura `{ categories: {...}, timestamp: ISO8601, version: "1" }`
- Scadenza: 180 giorni
- SameSite=Lax, Secure=true in produzione
- Non classificato come tracking cookie (è di gestione del consenso)

---

## 2. Categorie di cookie

### Necessari (sempre attivi, no opt-out)
- Gestione della sessione (`pro_session`)
- Cookie di consenso stesso (`anlyra_consent_v1`)
- CSRF protection
- Preferenze di lingua

**Nessun opt-out possibile**: questi cookie sono necessari per il funzionamento del sito. Il banner li informa ma non offre toggle.

### Funzionali (opt-in)
- Preferenze UI (tema, layout dashboard)
- Lingua preferita (se non gestita da URL locale)
- "Ricordami" al login

**Default**: off. L'utente deve attivarli esplicitamente.

### Analytics (opt-in)
- Analisi del traffico anonimizzata (es. Plausible, se adottato)
- Tracking conversioni non personali (es. quale landing page converte)
- Heatmap anonime (es. Microsoft Clarity, se adottato)

**Default**: off. Solo se attivati esplicitamente.

### Marketing (opt-in)
- Pixel per campagne (Meta, Google Ads, LinkedIn Ads)
- Cookie retargeting
- Attribution modelli paid

**Default**: off. Solo se attivati esplicitamente.
**Nota**: per PMI B2B che non fanno campagne paid, questa categoria può essere omessa inizialmente.

---

## 3. Design del banner

### Principi UX (anti dark pattern)
- **Nessun "Accetta tutto" prominente rispetto alle alternative.** I tre bottoni devono essere visivamente equivalenti.
- **Nessun pre-check** sulle categorie facoltative.
- **Nessuna OPT-OUT nascosta** in menu secondari.
- **Nessun design che confonde "rifiuta" con "chiudi".**
- **Linguaggio chiaro e diretto.** Niente legalese nel banner stesso.

### Layout consigliato (banner a piè di pagina)
```
┌─────────────────────────────────────────────────────────┐
│ Usiamo i cookie per far funzionare il sito              │
│ (necessari) e, con il tuo consenso, per                 │
│ migliorarlo (analytics). Nessun cookie di               │
│ marketing senza il tuo ok esplicito.                    │
│                                                         │
│ [Accetta tutti]  [Solo necessari]  [Personalizza]       │
│                                                         │
│ Informativa completa → /legal/privacy                   │
└─────────────────────────────────────────────────────────┘
```

### Stile bottoni
- Tutti e tre i bottoni hanno lo stesso peso visivo (nessuno filled/ghost asimmetrico).
- "Personalizza" apre il pannello di gestione granulare.
- Colori: allineati a [`brand-guidelines.md`](../brand-guidelines.md) (sage per accenti, panna per sfondo).

### Pannello di personalizzazione (modal/drawer)
```
Gestisci le preferenze cookie

[toggle] Necessari (sempre attivi — non modificabile)
[toggle] Funzionali — off by default
[toggle] Analytics — off by default
[toggle] Marketing — off by default

[Salva preferenze]   [Accetta tutti]   [Solo necessari]
```

---

## 4. Copy del banner

### Versione italiana (primaria)
```
Titolo: "Cookie e privacy"

Testo breve:
"Usiamo cookie necessari per far funzionare Anlyra.
Con il tuo consenso, usiamo anche cookie di analytics
per capire come migliorare il servizio.
Non usiamo cookie di profilazione pubblicitaria."

CTA:
- Bottone primario: "Accetta tutto"
- Bottone secondario: "Solo necessari"
- Bottone terziario: "Personalizza"

Footer link: "Informativa completa" → /it/legal/privacy
```

### Versione inglese (secondaria, per `/en`)
```
Title: "Cookies & privacy"

Short text:
"We use necessary cookies to run Anlyra.
With your consent, we also use analytics cookies
to understand how to improve the service.
No advertising profiling cookies."

CTA:
- "Accept all"
- "Necessary only"
- "Customize"

Footer: "Full policy" → /en/legal/privacy
```

---

## 5. Caricamento script condizionale al consenso

Gli script di terze parti (analytics, marketing) devono essere caricati **solo dopo** il consenso esplicito per la rispettiva categoria.

### Pattern consigliato (Next.js)
```typescript
// Caricare script analytics solo se anlyra_consent_v1.categories.analytics === true
// Usare next/script con strategy="lazyOnload" condizionale
// Oppure: injettare il tag script dinamicamente dopo consent update
```

**Non usare**: `strategy="beforeInteractive"` o `strategy="afterInteractive"` per script non necessari — caricano prima del consenso.

**Pattern sicuro**: leggere il cookie di consenso all'hydration del client, poi caricare gli script solo se il consenso è presente e valido.

---

## 6. Trigger per il re-consent

| Evento | Azione |
|--------|--------|
| Scadenza 6 mesi (`anlyra_consent_v1` expired) | Mostrare banner come prima visita |
| Aggiunta nuova categoria cookie | Incrementare versione (`v2`, `v3`) e mostrare banner |
| Utente clicca "Modifica preferenze" in `/legal/privacy` | Aprire pannello di personalizzazione |
| Cambio normativa significativo | Incrementare versione e re-consent |

---

## 7. Provider raccomandato

### Custom (raccomandato per Anlyra)
- **Pro**: pieno controllo UX, nessun third-party loader, design coerente con il brand.
- **Con**: richiede sviluppo ~2–3 giorni, test accurati.
- **Quando**: già dal lancio, per coerenza con il posizionamento "privacy seria, sul serio."

### Iubenda
- **Pro**: gestione legale automatica, aggiornamenti normativi inclusi.
- **Con**: widget non personalizzabile al 100%, branding Iubenda visibile.
- **Quando**: per accelerare il lancio se lo sviluppo custom è bloccante.

### Cookiebot
- **Pro**: scan automatico dei cookie sul sito, aggiornamenti automatici.
- **Con**: costoso per piani con domini multipli, controllo UX limitato.
- **Quando**: se il sito usa molti cookie di terze parti da gestire.

**Raccomandazione**: implementazione custom allineata al brand Anlyra, con codice mantenuto internamente.

---

**Status**: planning document. Implementare prima del lancio pubblico. Validare il design con il DPO (da nominare) e con una persona che abbia competenza in GDPR italiano.
