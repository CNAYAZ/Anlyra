---
title: Anlyra · Brand Guidelines
version: 1.0
audience: designer freelance, agenzie social, content writer, partner esterni
status: living document
last updated: 2026-05-24
---

# Anlyra · Brand Guidelines

> Identità visiva, tono di voce e linee guida d'uso del brand Anlyra.
>
> **Audience**: chiunque crei materiali per Anlyra esternamente — designer, social media
> manager, content writer, fotografo, agenzia PR.
>
> **Goal**: garantire coerenza di tutti i touchpoint del brand, dal sito al social alla
> documentazione tecnica.
>
> **Fonte di verità tecnica**: `HANDOFF_BUNDLE.md` (design system per sviluppatori).

---

## 1. Brand identity

### 1.1 Mission

Aiutare le PMI italiane a prendere decisioni migliori grazie ad analytics AI di livello
enterprise, senza la complessità o i costi di soluzioni B2B tradizionali.

### 1.2 Brand promise

> **"Analytics di livello enterprise per PMI italiane. Privacy seria, sul serio."**

Questa frase non è solo un tagline: è un impegno contrattuale. Ogni comunicazione Anlyra
deve essere misurabile contro questa promessa.

### 1.3 Valori brand

**1. Onestà radicale**
Nessun claim gonfiato. Se non lo facciamo, non lo diciamo. Se ci sono limiti, li
ammettiamo. Preferiamo perdere un lead piuttosto che creare aspettative false.

**2. Privacy come prerequisito**
Non vendiamo dati, non li usiamo per training AI di terze parti, non li condividiamo per
marketing. Non è una policy: è l'architettura del prodotto.

**3. Calore professionale**
B2B non significa freddo e corporate. Siamo italiani che parlano con italiani —
professionisti, ma con umanità. Una PMI non è un "client account number": è Mario che
gestisce 15 persone e non dorme la notte pensando al cashflow.

**4. Sostanza > forma**
Meglio una feature che funziona di una promessa visiva. Il design serve il contenuto,
non viceversa. Niente "design awards", solo design che riduce la fatica cognitiva.

**5. Trasparenza pricing**
3 piani chiari, nessuna asterisco nascosta, nessun "contact sales" tranne per Enterprise.
Il prezzo si vede al primo click, non dopo un demo call.

### 1.4 Personality

Se Anlyra fosse una persona:

| Dimensione | Descrizione |
|---|---|
| **Età** | 35-50 anni |
| **Background** | PMI-owner o financial controller, sa usare Excel bene ma è stanco dei suoi limiti |
| **Città** | Bologna o Milano (professionista metropolitano, non romano, non startup-hype) |
| **Stile** | Cura sobria — qualità nei dettagli, niente flashy (Barbour, non Gucci) |
| **Comunicazione** | Diretto, chiaro, usa l'italiano vero — no anglicismi forzati |
| **Humour** | Presente ma discreto, mai a discapito del cliente |
| **Politica** | Assolutamente neutro |

### 1.5 Anti-positioning — cosa Anlyra NON è

Per chiarire l'identità per contrasto:

- ❌ Una startup "disruption tech" che parla di "rivoluzione" e "game-changer"
- ❌ Una piattaforma con dark patterns (annual upsell aggressivo, cancel friction, bait-and-switch trial)
- ❌ Un brand che esagera promesse ("aumenta il fatturato del 300%!")
- ❌ Un servizio che usa il fear marketing ("la tua azienda fallirà senza analytics!")
- ❌ Un fintech che si presenta come unicorn o scale-up
- ❌ Un "Swiss Army knife" che fa tutto — Anlyra fa analytics per PMI italiane, punto

---

## 2. Logo e wordmark

### 2.1 Wordmark

**"Anlyra"** scritto in **Inter Semi-Bold** (weight 600), letter-spacing `-0.01em`
(leggermente tighter del default per un look più premium).

La "A" iniziale può essere usata anche come simbolo standalone (monogramma) in contesti
dove lo spazio è limitato (favicon, avatar, app icon).

### 2.2 Varianti wordmark

| Variante | Sfondo | Colore testo | Uso |
|---|---|---|---|
| **Standard** | Panna (`hsl(36 47% 96%)`) | Sage-700 (`hsl(102 20% 24%)`) | Default per tutti i materiali |
| **On-dark** | Scuro (`hsl(30 6% 10%)`) | Panna-light (`hsl(36 26% 90%)`) | Dark mode, sfondi scuri |
| **Monocromatico nero** | Bianco | Nero `#000000` | Stampa B/N, ricamo, incisione |
| **Monocromatico bianco** | Qualsiasi scuro | Bianco `#FFFFFF` | Stampa su sfondi scuri |

### 2.3 Dimensioni minime

- **Digital**: 80px width minimo (sotto questa soglia la leggibilità decade)
- **Stampa**: 20mm width minimo

### 2.4 Clear space

Spazio libero minimo attorno al wordmark = altezza della cap-height della "A".
Nessun testo, icona o elemento visivo deve invadere questa zona.

### 2.5 Cosa NON fare con il wordmark

- ❌ Non stiracchiare (mantenere proporzioni originali)
- ❌ Non ruotare (sempre orizzontale, mai verticale o obliquo)
- ❌ Non cambiare font (sempre Inter Semi-Bold 600)
- ❌ Non cambiare colore al di fuori della palette approvata
- ❌ Non aggiungere effetti (ombre, gradient, outline, emboss)
- ❌ Non posizionare su sfondi fotografici ad alta frequenza
- ❌ Non mischiare con altri loghi senza spaziatura adeguata (almeno 1× width del wordmark)

---

## 3. Palette colori

> **Nota tecnica**: i token canonici sono definiti come variabili HSL in
> `src/app/globals.css` e usati via `tailwind.config.ts`. I valori hex qui sotto
> sono approssimazioni per uso in strumenti di design (Figma, Canva, Adobe). Usare
> i valori `hsl()` esatti per massima accuratezza.

### 3.1 Background — panna (sfondo principale, neutralità calda)

Il sistema di colori Anlyra usa un background "panna" invece del bianco standard.
Riduce l'affaticamento visivo e dà un senso di cura artigianale.

| Token | HSL | Hex approx | Uso |
|---|---|---|---|
| `--background` | `hsl(36 47% 96%)` | `#FAF6EE` | Background pagina principale |
| `--card` | `hsl(36 50% 97%)` | `#FDFAF3` | Background card/panel |
| `--muted` | `hsl(36 30% 92%)` | `#EDE6D8` | Aree muted, input disabled |
| `--border` | `hsl(36 28% 86%)` | `#DDD3C3` | Bordi standard |
| `--border-strong` | `hsl(36 22% 78%)` | `#CBBFAF` | Bordi rinforzati |

### 3.2 Sage — primary brand color (9 stop)

Il sage è il verde salvia che definisce il brand. Non è il verde "tech" saturo
di Spotify o WhatsApp — è un verde caldo, maturo, professionale.

| Token | HSL | Hex approx | Uso |
|---|---|---|---|
| `sage-50` | `hsl(98 22% 90%)` | `#E1E9DC` | Hover light, pill background, sidebar active |
| `sage-100` | `hsl(96 20% 80%)` | `#C5D1BD` | Border subtle accent |
| `sage-200` | `hsl(96 18% 65%)` | `#9BAF91` | Decorative accents |
| `sage-300` | `hsl(96 25% 78%)` | `#BAD0B2` | Disabled states, placeholders |
| `sage-400` | `hsl(95 22% 60%)` | `#849E77` | Secondary emphasis |
| **`sage-500`** | `hsl(98 17% 41%)` | **`≈#6D7A57`** | **PRIMARY BRAND COLOR — CTA, active nav, focus ring** |
| `sage-600` | `hsl(100 18% 32%)` | `≈#536043` | Hover su elementi sage-500 |
| `sage-700` | `hsl(102 20% 24%)` | `≈#3D4C31` | Pressed/active, wordmark, heading emphasis |
| `sage-800` | `hsl(102 22% 18%)` | `≈#2E3B26` | Dark accents |

> **`sage-500` è il colore primario Anlyra.** Usato su: CTA button, focus ring,
> link attivi, bordi di enfasi, icone brand.

### 3.3 Foreground (testo)

| Token | HSL | Hex approx | Uso |
|---|---|---|---|
| `--fg` | `hsl(30 12% 15%)` | `#2A2520` | Body principale (warm dark, mai nero puro) |
| `--fg-2` | `hsl(30 8% 40%)` | `#6B6558` | Subtitle, label secondarie, caption |
| `--fg-3` | `hsl(30 7% 55%)` | `#908880` | Hint, placeholder, disabled |

> Anlyra non usa nero puro `#000000` per il testo. Il calore del `fg` principale
> `#2A2520` mantiene coerenza con la palette panna.

### 3.4 Colori semantici

**Success** — verde oliva (per conferme, dati positivi, KPI in crescita)

| Token | HSL | Uso |
|---|---|---|
| `success-50` | `hsl(72 35% 90%)` | Background feedback success |
| `success-500` | `hsl(72 35% 35%)` | Icona, testo, bordo sinistro alert |
| `success-700` | `hsl(75 35% 25%)` | Pressed, link su sfondo success-50 |

**Warning** — ocra ambra (per attenzione, soglie raggiunte, dati da verificare)

| Token | HSL | Uso |
|---|---|---|
| `warning-50` | `hsl(35 60% 90%)` | Background feedback warning |
| `warning-500` | `hsl(35 60% 38%)` | Icona, testo, bordo sinistro alert |
| `warning-700` | `hsl(35 60% 26%)` | Pressed |

**Danger** — terracotta (per errori, alert critici, KPI negativi gravi)

| Token | HSL | Uso |
|---|---|---|
| `danger-50` | `hsl(12 50% 92%)` | Background feedback error |
| `danger-500` | `hsl(12 45% 42%)` | Icona, testo, bordo sinistro alert |
| `danger-700` | `hsl(12 45% 30%)` | Pressed |

> Il rosso Anlyra è **terracotta** — caldo, non aggressivo. NON è il rosso vivo
> di Bootstrap o Stripe.

**Info** — azzurro polvere (per info neutre, tooltip, banner non critici)

| Token | HSL | Uso |
|---|---|---|
| `info-50` | `hsl(210 35% 92%)` | Background feedback info |
| `info-500` | `hsl(210 35% 45%)` | Icona, testo, bordo sinistro alert |
| `info-700` | `hsl(210 35% 32%)` | Pressed |

### 3.5 Elevazione (shadows)

Le ombre Anlyra usano un colore warm-neutral (`hsl(30 25% 15%)`), mai nero puro.
Esistono 4 livelli di elevazione:

| Livello | Uso tipico |
|---|---|
| `elev-1` | Card standard, KPI, sidebar item |
| `elev-2` | Hover card, dropdown |
| `elev-3` | Modal, toast, popover |
| `elev-4` | Sheet, overlay fullscreen |

### 3.6 Cosa NON fare con i colori

- ❌ Non usare verde saturo (Slack, WhatsApp, Spotify) — troppo aggressivo, anti-brand
- ❌ Non usare blu (Linear, Notion, Stripe) — già dominante nel B2B SaaS
- ❌ Non usare gradient diagonali o radiali (mai nel brand Anlyra)
- ❌ Non saturare oltre sage-500 per elementi brand
- ❌ Non accoppiare `success-500` e `sage-500` (troppo simili, creano confusione semantica)
- ❌ Non usare ombre con colore vivace — solo warm-neutral `elev-*`
- ❌ Non usare nero puro `#000000` o bianco puro `#FFFFFF` come colori brand

---

## 4. Tipografia

### 4.1 Font primari

**Inter** (sans-serif, via Google Fonts) — font principale per tutto
- Weights: **400** (regular), **500** (medium), **600** (semi-bold)
- Weight 700+ non è caricato: evitare in qualsiasi materiale brand
- Letter-spacing: `-0.01em` default, `-0.02em` per heading large
- `font-feature-settings: "cv02", "cv03", "cv04", "cv11"` per rendering premium

**JetBrains Mono** (monospace, via Google Fonts) — solo per numeri e codice
- Weights: **400** e **500**
- Uso: numeri tabulari nei KPI, code snippets, riferimenti tecnici
- **Mai** per body text o titoli

### 4.2 Scale tipografica

| Elemento | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| Display (hero) | 48–64px | 600 | 1.1 | −0.02em |
| H1 pagina | 36px | 600 | 1.15 | −0.01em |
| H2 sezione | 28px | 600 | 1.2 | −0.01em |
| H3 sottosezione | 22px | 600 | 1.3 | −0.005em |
| H4 widget/card | 17–18px | 600 | 1.35 | 0 |
| Body | 16px | 400 | 1.55 | 0 |
| Body small | 14px | 400 | 1.5 | 0 |
| Caption | 12–13px | 400–500 | 1.4 | +0.005em |
| Numeri tabulari | variabile | 500–600 | 1 | `tabular-nums` (JetBrains Mono) |

> **Regola tabular nums**: ogni numero esposto in tabelle, KPI, valute, percentuali
> deve usare `font-variant-numeric: tabular-nums` per allineamento verticale.

### 4.3 Cosa NON fare con la tipografia

- ❌ Non usare font di sistema (`-apple-system`, Arial, ecc.) — sempre Inter via Google Fonts
- ❌ Non usare weight 700 o 800 — non è caricato, causa fallback del sistema
- ❌ Non usare letter-spacing positivo > 0.01em su heading (perde feel premium)
- ❌ Non usare TUTTO MAIUSCOLO per testo corrente (solo per acronimi: PMI, AI, GDPR)
- ❌ Non mischiare Inter e JetBrains Mono nella stessa riga tranne per inline code

---

## 5. Voice & Tone

### 5.1 Voice (costante in tutti i canali)

**Italiano professionale e umano.**

Parla a un decision-maker PMI (titolare, CFO, controller) di 35-50 anni, abituato a
Excel ma curioso di AI, con poco tempo e poca pazienza per il marketing-speak.

**Principi sempre validi:**
- Mai gergo da startup ("scale", "growth hack", "north star metric")
- Mai marketing-speak vuoto ("rivoluziona la tua azienda")
- Diretto e specifico quando possibile ("i clienti che usano questa feature vedono 12% di margin improvement in media")
- Onesto sui limiti ("non facciamo X, ma facciamo Y molto bene")

### 5.2 Tone (varia per contesto)

**Landing page / marketing** — caldo, esperto, sicuro
> "Sappiamo come le PMI italiane crescono. Anlyra ti mostra dove intervenire, con i numeri alla mano."

**Documentazione tecnica** — pulito, preciso, neutro
> "Per configurare il webhook Stripe, naviga in Developers → Webhooks → Add endpoint."

**Email transactional** — caldo, conciso, rispettoso del tempo
> "Marco, abbiamo confermato il tuo pagamento. Riepilogo in allegato."

**Error messages** — empatico, mai blame, sempre una via d'uscita
> "Non siamo riusciti a salvare. Controlla la connessione e riprova."

**Customer support** — paziente, competente, italiano vero
> "Capisco il problema. Vediamolo insieme — dimmi cosa stai cercando di fare."

**Notifiche / alert** — discrete, informative, no push aggressivo
> "Nuovo insight: il tuo burn rate è aumentato del 15% questa settimana."

### 5.3 Vocabolario brand

**Usa queste parole:**

| Preferito | Invece di |
|---|---|
| "analytics" | "big data", "data intelligence" |
| "insight" | "recommendation engine output" |
| "dashboard" / "cruscotto" | "platform interface" |
| "cliente" / "azienda" | "user", "account" |
| "piano" | "subscription", "abbonamento" |
| "PMI" | "small business", "SMB" |
| "funziona" | "is deployed", "is live" |
| "privacy" | "data privacy compliance" |
| "problema" | "pain point", "challenge" |
| "crescere" | "scale up", "scale" |

**Evita sempre:**

| Vietato | Motivazione |
|---|---|
| "rivoluzionare" | Claim gonfiato, non misurabile |
| "disrupting / disruptive" | Anglicismo overused, suona fake |
| "game-changer" | Cliché, perde significato |
| "stakeholder" | Troppo corporate, usa "team" o "interlocutori" |
| "ROI" (senza definirlo) | Vago; preferire "ritorno" con numero specifico |
| "pain point" | Usa "problema" o "frizione" |
| "onboarding" | In comunicazioni con clienti usa "primo accesso" o "configurazione" |
| "leverage" (verbo) | Non esiste in italiano |

### 5.4 Esempi do/don't

**Headline landing:**
- ✅ "Analytics di livello enterprise per PMI italiane"
- ❌ "Revolutionary AI-powered insights to 10× your business growth 🚀"

**Pricing copy:**
- ✅ "Avanzato · €149/mese · Per team in crescita che vogliono insight più profondi"
- ❌ "🚀 PRO PLAN · BEST VALUE · Limited time offer! Don't miss out!"

**Email subject (verify):**
- ✅ "Conferma il tuo indirizzo email · Anlyra"
- ❌ "[ACTION REQUIRED] Verify your email NOW or lose access ⚠️"

**Privacy promise:**
- ✅ "Non vendiamo i tuoi dati. Mai. Punto."
- ❌ "We are GDPR-compliant and respect user privacy with industry-leading security practices."

**Error 500:**
- ✅ "Qualcosa è andato storto dalla nostra parte. Riprova tra qualche minuto — ci scusiamo."
- ❌ "ERROR 500: Internal Server Error. Please contact administrator."

**Trial expiring email:**
- ✅ "Marco, mancano 3 giorni alla fine della prova. Vuoi continuare con Anlyra?"
- ❌ "⏰ TRIAL EXPIRING SOON ⏰ ACTIVATE NOW before you lose your data! 🔥"

**Alert KPI:**
- ✅ "Il tuo burn rate è aumentato del 15% rispetto al mese scorso."
- ❌ "🚨 CRITICAL ALERT: BURN RATE SPIKE DETECTED! TAKE ACTION NOW!"

---

## 6. Imagery & Photography

### 6.1 Stile fotografia

**Quando usata** (landing, social, press kit):
- Ritratti professionali sobri (founder, team) — fotografia naturale, niente studio over-illuminato
- Office life italiana (Bologna/Milano vibe) — luce naturale, finestre vere, non light box
- Mai stock photo di "businessman sorridente con grafici olografici"

**Tone fotografico:**
- Documentaristico, non regia
- Calmo, non frenetico
- Italiano riconoscibile (location EU/IT, abbigliamento italiano, architettura italiana)
- Palette warm e coerente con panna+sage (evitare sfondi bianchi puri o neon)

### 6.2 Illustrazioni

Anlyra **non usa illustrazioni blob** (Stripe early-2020s style) o isometric 3D.
Preferisce:
- Screenshot reali della dashboard (mostra il prodotto, non un'astrazione)
- Diagrammi schematici minimal (linee sottili sage-200/300, nessun colore brillante)
- Icone Lucide (stroke 1.5–2px, mai filled, sempre monocromatiche)

### 6.3 Cosa NON fare

- ❌ Stock photo Shutterstock/Getty generici
- ❌ "Diversity team laughing in modern office" — americanate evidenti
- ❌ Illustrazioni blob/gradient stile startup 2020-2022
- ❌ 3D rendering iper-realistici (troppo pesante visivamente)
- ❌ AI-generated imagery Midjourney senza review — rischio di inconsistenza stilistica
- ❌ GIF animate per contenuti evergreen (accettabili solo per tutorial brevi)

---

## 7. UI/UX principles

Questi principi si applicano sia al prodotto sia ai materiali brand.

### 7.1 Density

**Airy ma non vuoto.** Spaziature generose ma contenuto sostanzioso. Il minimalismo
è un mezzo, non un fine. Una pagina con pochi elementi deve comunque rispondere alla
domanda "perché dovrei usare questo?".

### 7.2 Movimento

**Discreto e funzionale.** Transitions: 150–300ms `ease-out`. Mai: sparkle, bounce,
parallax aggressivo, attention-grabber. Hover lift: max `-1px translateY`. L'animazione
comunica feedback, non vuole impressionare.

Rispettare `prefers-reduced-motion`: tutte le animazioni devono avere un fallback statico.

### 7.3 Feedback

**Mai silenzio.** Ogni azione utente che ha effetti deve confermare con qualcosa:
toast, modal, state change visivo. "Hai cliccato salva" → "Salvato" (non nulla).

### 7.4 Error states

**Mai blame user.** L'errore è sempre un'opportunità di aiutare. Format standard:
1. Cosa è andato storto (brevissimo, senza codici tecnici)
2. Come risolvere (una azione concreta)
3. Dove chiedere aiuto se non si risolve (link support)

### 7.5 Accessibility

WCAG AA minimo su tutti i componenti:
- Contrasto testo su sfondo: ≥ 4.5:1 per body, ≥ 3:1 per large text
- Focus ring sempre visibile (sage-500 ring a 3px)
- Screen reader: aria-label su icon buttons, role appropriato su componenti custom
- Keyboard navigation completa su tutti i form e modal

---

## 8. Social media voice

### 8.1 Canali

| Canale | Priorità | Frequenza target | Tone |
|---|---|---|---|
| **LinkedIn** | Primario | 2-3 post/settimana | Professionale, insight-driven |
| **Twitter/X** | Secondario | 5-10 post/settimana | Più diretto, conversational |
| Instagram | Non consigliato | — | Target sbagliato per B2B SaaS |
| TikTok | Non consigliato | — | Target sbagliato |

### 8.2 LinkedIn tone

Più colloquiale del sito, ma sempre professionale. Italiano puro. No hashtag spam.

**Sì:**
> "Abbiamo lanciato la feature X. Risolve questo problema specifico nelle PMI manifatturiere. Link per provarla."

**No:**
> "🚀🚀 BIG NEWS! Anlyra now disrupts the analytics space with our groundbreaking feature! 💪 #AI #Analytics #Disruption #SaaS #Innovation"

### 8.3 Twitter/X tone

Più breve e diretto. Opinioni costruite su dati. Engagement con community PMI e
professionisti italiani.

**Sì:**
> "Il 60% delle PMI italiane non sa in tempo reale quanti soldi ha in cassa. Anlyra risolve questo in 5 minuti."

**No:**
> "Our AI is literally changing the game 🔥🔥🔥"

### 8.4 Cosa non pubblicare sui social

- ❌ Claim senza fonte ("il 98% degli utenti è soddisfatto" — se non verificato)
- ❌ Screenshots di competitor con commenti negativi
- ❌ Notizie politiche o religiose
- ❌ Emoji decorativi > 1 per post
- ❌ Thread di 15 tweet su "X lezioni che ho imparato in Y anni" senza valore reale

---

## 9. Asset locations

| Asset | Percorso | Note |
|---|---|---|
| Color tokens | `src/app/globals.css` | Fonte di verità HSL, light + dark mode |
| Tailwind config | `tailwind.config.ts` | Token mappati su Tailwind classes |
| Font loading | `src/app/layout.tsx` | Inter 400/500/600 + JetBrains Mono 400/500 |
| OG image (auto-generated) | `src/app/opengraph-image.tsx` | 1200×630, panna+sage, edge runtime |
| Design system ref | `HANDOFF_BUNDLE.md` | Fonte di verità per sviluppatori |
| Logo SVG | `assets/brand/logo/` | Da creare prima del launch |
| Photography approvate | `assets/brand/photography/` | Da creare prima del launch |

---

## 10. Approval workflow

Per uso del brand da parte di partner esterni:

| Livello | Chi può | Cosa |
|---|---|---|
| **Self-serve** | Chiunque | Wordmark + palette + tipografia in contesti standard |
| **Email approval** | Richiede OK scritto | Logo applicato a prodotti fisici, co-branding, press materials, whitepaper |
| **Approval formale** | Richiede contratto | Qualsiasi uso che modifica il logo, varia la palette, uso pubblicitario a pagamento con nome Anlyra |

**Contatto**: `brand@anlyra.it` — risposta entro 2 giorni lavorativi.

---

## Note finali

- Questo documento è un **living document**: aggiornato ad ogni evoluzione del brand.
- Per domande su casi non coperti: `brand@anlyra.it`
- Per il design system tecnico (componenti, tokens, spacing): vedere `HANDOFF_BUNDLE.md`
- Versioni precedenti archiviate in `docs/archive/`

---

**Versione**: 1.0
**Ultimo aggiornamento**: 2026-05-24
**Autore**: Anlyra team
**Status**: Living document — aggiornare con ogni evoluzione del brand
