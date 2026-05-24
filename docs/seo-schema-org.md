# Schema.org JSON-LD Implementation

Structured data Schema.org per abilitare i rich snippets di Google.

## Schemas implementati

### Globali (in `src/app/layout.tsx`)
- **Organization**: brand identity Anlyra (logo, indirizzo, contatti, social)
- **WebSite**: identity del sito web, collegata all'Organization via `@id`

### Landing (`src/app/[locale]/page.tsx`)
- **SoftwareApplication**: prodotto SaaS con `offers` (Pro, Avanzato)

### Pricing (`src/app/[locale]/pricing/page.tsx`)
- **Product** × 2: Pro (mensile + annuale), Avanzato (mensile + annuale)
- **BreadcrumbList**: Home → Pricing (locale-aware)

## Schemas disponibili ma non ancora inseriti
- **FAQPage** (`faqSchema`): pronta in `src/lib/seo/json-ld.ts`, da inserire dove c'è
  una sezione FAQ visibile (es. pricing page se si vuole esporre le FAQ come rich snippet).

## Architettura

Tutti gli helper vivono in `src/lib/seo/json-ld.ts` e ritornano oggetti plain.
L'inserimento avviene inline nei Server Components:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
/>
```

`@id` cross-reference collega gli schemi tra loro (WebSite → Organization,
Product → Organization come seller), così Google li interpreta come un grafo unico.

## Testing rich snippets
1. Deploy in produzione (o preview Vercel)
2. Test Google Rich Results: https://search.google.com/test/rich-results
3. Inserisci l'URL Anlyra (es. `https://anlyra.it/it/pricing`)
4. Verifica gli schemas rilevati e l'anteprima dei rich snippets
5. Validazione generica: https://validator.schema.org

## Placeholder da aggiornare con dati reali
- `legalName`: "Anlyra S.r.l." — verificare ragione sociale effettiva
- `address`: Bologna / Emilia-Romagna — indirizzo reale
- `foundingDate`: '2026' — anno di costituzione
- `sameAs`: array vuoto — aggiungere URL profili social quando attivati
- `contactPoint.email`: `support@anlyra.it` — da attivare pre-launch

## Note
- I prezzi negli schema (€49 Pro, €149 Avanzato) sono allineati ai valori in
  `src/messages/it.json` (`pricing.plans.*.priceMonthly`). Mantenere sincronizzati
  se cambiano i prezzi.
- Le descrizioni dei piani nei Product schema (crediti AI, numero utenti) sono
  indicative — allineare con il copy di marketing ufficiale.

## Riferimenti
- https://schema.org/docs/full.html
- https://developers.google.com/search/docs/appearance/structured-data
- https://json-ld.org/
