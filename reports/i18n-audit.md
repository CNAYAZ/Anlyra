# Audit i18n — stato traduzioni Anlyra
> Branch: claude/merge-repos-nextjs-rOZU3 — Data: 2026-05-11

---

## Riassunto numerico

- **Totale stringhe hardcoded trovate:** 89
- **Totale file impattati:** 15
- **File che NON usano useTranslations (>20 righe):** 143 *(di cui 128 in realtà non contengono UI text — si tratta di componenti UI puri, chart wrapper, tipi o utility)*
- **File con almeno una stringa hardcoded UI-visibile:** 15

### Pagine più colpite (top 5)

| # | File | Stringhe |
|---|------|---------|
| 1 | `src/app/[locale]/(dashboard)/page.tsx` | 22 |
| 2 | `src/app/[locale]/(dashboard)/market/page.tsx` | 10 |
| 3 | `src/app/[locale]/(dashboard)/operations/team/page.tsx` | 9 |
| 4 | `src/app/[locale]/(dashboard)/market/competitors/page.tsx` | 9 |
| 5 | `src/app/[locale]/(dashboard)/operations/customers/page.tsx` | 9 |

### Componenti più colpiti (top 5)

| # | File | Stringhe |
|---|------|---------|
| 1 | `src/app/[locale]/(dashboard)/market/positioning/page.tsx` | 8 |
| 2 | `src/app/[locale]/(dashboard)/operations/efficiency/page.tsx` | 6 |
| 3 | `src/components/notifications/notification-prefs.tsx` | 2 |
| 4 | `src/app/[locale]/settings/billing/BillingClient.tsx` | 2 |
| 5 | `src/components/market/competitor-form-dialog.tsx` | 2 |

### Distribuzione per categoria

| Categoria | Conteggio |
|-----------|-----------|
| Titoli e sottotitoli di sezione (`PageHeader`, `CardHeader`) | 30 |
| Etichette KPI (`label=`) | 10 |
| Intestazioni colonne di tabella (`<th>`) | 16 |
| Stringhe inline nel JSX (testo corpo, template literals) | 16 |
| Etichette form (`<Label>`, `placeholder=`) | 7 |
| Legend serie grafici (`name=` in Recharts) | 5 |
| Bottoni e CTA | 3 |
| Toast/alert | 0 |
| Attributi `aria-label`, `title` HTML, `alt` | 2 |

---

## File con maggiori problemi (>5 stringhe)

### 1. `src/app/[locale]/(dashboard)/page.tsx` — 22 stringhe

| Riga | Stringa originale | Tipo | Chiave i18n suggerita |
|------|-------------------|------|----------------------|
| 38 | `'Apri dashboard finanza'` | CTA/azione rapida | `overview.quickActions.finance` |
| 39 | `'Analisi mercato'` | CTA/azione rapida | `overview.quickActions.market` |
| 40 | `'KPI operativi'` | CTA/azione rapida | `overview.quickActions.operations` |
| 41 | `'Chat con l'AI'` | CTA/azione rapida | `overview.quickActions.aiChat` |
| 55–59 | `` `Margine netto al ${…} negli ultimi 12 mesi. Burn rate ${…}/mese, runway ${…} mesi.` `` | Template literal AI spotlight | `overview.aiSpotlight.summary` |
| 59 | `'Stiamo raccogliendo i tuoi dati. Apri la dashboard finanza per saperne di più.'` | Testo stato vuoto | `overview.aiSpotlight.loading` |
| 63 | `title="Panoramica"` | Titolo pagina | `overview.title` |
| 63 | `subtitle="Sintesi della tua azienda negli ultimi 12 mesi"` | Sottotitolo pagina | `overview.subtitle` |
| 71 | `label="Ricavi 12m"` | Etichetta KPI | `overview.kpi.revenue12m` |
| 77 | `label="Costi 12m"` | Etichetta KPI | `overview.kpi.costs12m` |
| 84 | `label="Margine netto"` | Etichetta KPI | `overview.kpi.netMargin` |
| 89 | `label="Cash disponibile"` | Etichetta KPI | `overview.kpi.cashAvailable` |
| 99 | `title="AI Spotlight"` | Intestazione card | `overview.aiSpotlight.title` |
| 109 | `"Insight automatico"` | Etichetta sezione | `overview.aiSpotlight.badge` |
| 116 | `"Ultimo mese — Ricavi"` | Label dato | `overview.lastMonth.revenue` |
| 120 | `"Ultimo mese — Costi"` | Label dato | `overview.lastMonth.costs` |
| 124 | `"Ultimo mese — Profitto netto"` | Label dato | `overview.lastMonth.netProfit` |
| 133 | `Vai alla dashboard finanza completa` | Link CTA | `overview.goToFinance` |
| 140 | `title="Azioni rapide"` | Intestazione card | `overview.quickActions.title` |
| 168 | `label="MRR"` | Etichetta KPI | `overview.kpi.mrr` |
| 174 | `label="Clienti attivi"` | Etichetta KPI | `overview.kpi.activeCustomers` |
| 181 | `label="Runway"` | Etichetta KPI | `overview.kpi.runway` |

---

### 2. `src/app/[locale]/(dashboard)/market/page.tsx` — 10 stringhe

| Riga | Stringa originale | Tipo | Chiave i18n suggerita |
|------|-------------------|------|----------------------|
| 35 | `title="Market"` | Titolo pagina | `market.title` *(già nel namespace market)* |
| 35 | `subtitle="TAM · SAM · SOM e quota di mercato"` | Sottotitolo | `market.subtitle` |
| 43 | `label="Quota di mercato"` | Etichetta KPI | `market.kpi.marketShare` |
| 61 | `title="Sintesi"` | Intestazione card | `market.overview.summaryTitle` |
| 64 | `"Crescita stimata: "` | Label inline | `market.overview.estimatedGrowth` |
| 68 | `"Competitor monitorati: "` | Label inline | `market.overview.competitorsMonitored` |
| 79 | `title="Suggerimenti"` | Intestazione card | `market.overview.suggestionsTitle` |
| 81 | `"• Espandere nei segmenti PMI a maggior crescita."` | Bullet hardcoded | `market.overview.tip1` |
| 82 | `"• Monitorare il pricing dei competitor leader."` | Bullet hardcoded | `market.overview.tip2` |
| 83 | `"• Aumentare la brand awareness su canali content."` | Bullet hardcoded | `market.overview.tip3` |

---

### 3. `src/app/[locale]/(dashboard)/operations/team/page.tsx` — 9 stringhe

| Riga | Stringa originale | Tipo | Chiave i18n suggerita |
|------|-------------------|------|----------------------|
| 32 | `title="Team"` | Titolo pagina | `team.title` |
| 32 | `subtitle="Headcount, produttività e soddisfazione per dipartimento"` | Sottotitolo | `team.subtitle` |
| 39 | `` `${data.table.length} dipartimenti` `` | Template header card | `team.table.title` |
| 44 | `"Dipartimento"` | Intestazione colonna | `team.table.department` |
| 45 | `"Headcount"` | Intestazione colonna | `team.table.headcount` |
| 46 | `"Costo medio"` | Intestazione colonna | `team.table.avgCost` |
| 47 | `"Produttività"` | Intestazione colonna | `team.table.productivity` |
| 48 | `"Soddisfazione"` | Intestazione colonna | `team.table.satisfaction` |
| 49 | `"Turnover"` | Intestazione colonna | `team.table.turnover` |

---

### 4. `src/app/[locale]/(dashboard)/market/competitors/page.tsx` — 9 stringhe

| Riga | Stringa originale | Tipo | Chiave i18n suggerita |
|------|-------------------|------|----------------------|
| 38 | `title="Competitor"` | Titolo pagina | `market.competitors.title` |
| 38 | `subtitle="Quota di mercato e posizionamento"` | Sottotitolo | `market.competitors.subtitle` |
| 45 | `title="Nessun competitor"` | Stato vuoto | `market.competitors.empty.title` |
| 46 | `"Aggiungi competitor per iniziare l'analisi."` | Stato vuoto body | `market.competitors.empty.description` |
| 50 | `` `${data.competitors.length} competitor monitorati` `` | Template card header | `market.competitors.monitoredCount` |
| 55 | `"Nome"` | Intestazione colonna | `market.competitors.table.name` |
| 56 | `"Quota mercato"` | Intestazione colonna | `market.competitors.table.marketShare` |
| 57 | `"Ricavi stimati"` | Intestazione colonna | `market.competitors.table.revenue` |
| 58–60 | `"Dipendenti"`, `"Qualità"`, `"Pricing"` | Intestazioni colonna | `market.competitors.table.employees`, `.quality`, `.pricing` |

---

### 5. `src/app/[locale]/(dashboard)/operations/customers/page.tsx` — 9 stringhe

| Riga | Stringa originale | Tipo | Chiave i18n suggerita |
|------|-------------------|------|----------------------|
| 40 | `title="Clienti"` | Titolo pagina | `customers.title` |
| 40 | `subtitle="Churn, retention, NPS e crescita"` | Sottotitolo | `customers.subtitle` |
| 49 | `title="Churn vs Retention"` | Intestazione card | `customers.charts.churnRetention` |
| 66 | `title="Trend NPS"` | Intestazione card | `customers.charts.npsTrend` |
| 81 | `title="Nuovi clienti / mese"` | Intestazione card | `customers.charts.newCustomers` |
| 89 | `name="Nuovi"` | Nome serie grafico | `customers.charts.newSeries` |
| 96 | `title="Crescita cumulata"` | Intestazione card | `customers.charts.cumulativeGrowth` |
| 104 | `name="Clienti totali"` | Nome serie grafico | `customers.charts.totalSeries` |
| 58–59 | `name="Churn"`, `name="Retention"` | Nomi serie grafico | `customers.charts.churnSeries`, `.retentionSeries` |

---

### 6. `src/app/[locale]/(dashboard)/market/positioning/page.tsx` — 8 stringhe

| Riga | Stringa originale | Tipo | Chiave i18n suggerita |
|------|-------------------|------|----------------------|
| 28 | `label: 'Punti di forza'` | Label SWOT | `market.positioning.swot.strengths` |
| 29 | `label: 'Punti di debolezza'` | Label SWOT | `market.positioning.swot.weaknesses` |
| 30 | `label: 'Opportunità'` | Label SWOT | `market.positioning.swot.opportunities` |
| 31 | `label: 'Minacce'` | Label SWOT | `market.positioning.swot.threats` |
| 42 | `title="Posizionamento"` | Titolo pagina | `market.positioning.title` |
| 42 | `subtitle="Mappa qualità/prezzo e analisi SWOT"` | Sottotitolo | `market.positioning.subtitle` |
| 51 | `title="Mappa qualità vs pricing"` | Intestazione card | `market.positioning.mapTitle` |
| 56, 58 | `name="Prezzo"`, `name="Qualità"` | Assi grafico | `market.positioning.axisPrice`, `.axisQuality` |
| 63–64 | `name="TechFlow SRL"` | Nome azienda demo hardcoded | `market.positioning.ownScatterName` *(o caricare da profilo org)* |

---

### 7. `src/app/[locale]/(dashboard)/operations/efficiency/page.tsx` — 6 stringhe

| Riga | Stringa originale | Tipo | Chiave i18n suggerita |
|------|-------------------|------|----------------------|
| 27 | `title="Efficienza"` | Titolo pagina | `efficiency.title` |
| 27 | `subtitle="Ricavi per dipendente e produttività dipartimenti"` | Sottotitolo | `efficiency.subtitle` |
| 36 | `title="Ricavi per dipendente (trend)"` | Intestazione card | `efficiency.charts.revenuePerEmployee` |
| 45 | `name="Ricavi/dipendente"` | Nome serie grafico | `efficiency.charts.revenuePerEmployeeSeries` |
| 52 | `title="Produttività per dipartimento"` | Intestazione card | `efficiency.charts.deptProductivity` |
| 60 | `name="Produttività"` | Nome serie grafico | `efficiency.charts.productivitySeries` |

---

### 8. `src/app/[locale]/(dashboard)/operations/page.tsx` — 6 stringhe

| Riga | Stringa originale | Tipo | Chiave i18n suggerita |
|------|-------------------|------|----------------------|
| 26 | `churnRate: 'Churn rate'` | Label KPI map | `operations.kpi.churnRate` |
| 27 | `retention: 'Retention'` | Label KPI map | `operations.kpi.retention` |
| 28 | `nps: 'NPS'` | Label KPI map | `operations.kpi.nps` |
| 29 | `conversionRate: 'Conversion rate'` | Label KPI map | `operations.kpi.conversionRate` |
| 30 | `revenuePerEmployee: 'Ricavi / dipendente'` | Label KPI map | `operations.kpi.revenuePerEmployee` |
| 49 | `title="Operations"` | Titolo pagina | `operations.title` |
| 49 | `subtitle="KPI operativi della tua azienda"` | Sottotitolo | `operations.subtitle` |
| 75 | `title="Indicatori chiave"` | Intestazione card | `operations.kpi.sectionTitle` |
| 81 | `"target: "` | Label inline | `operations.kpi.targetLabel` |

> Nota: questo file ha 9 stringhe effettive, inserito nella tabella per completezza.

---

### 9. `src/app/[locale]/(dashboard)/market/trends/page.tsx` — 5 stringhe

| Riga | Stringa originale | Tipo | Chiave i18n suggerita |
|------|-------------------|------|----------------------|
| 32 | `title="Trend di mercato"` | Titolo pagina | `market.trends.title` |
| 32 | `subtitle="Evoluzione TAM/SAM/SOM negli ultimi 18 mesi"` | Sottotitolo | `market.trends.subtitle` |
| 39 | `title="TAM · SAM · SOM"` | Intestazione card | `market.trends.chartTitle` |
| 48–50 | `name="TAM"`, `name="SAM"`, `name="SOM"` | Nomi serie grafici | `market.trends.seriesTam`, `.seriesSam`, `.seriesSom` |

---

## File con problemi minori (1–4 stringhe)

| File | Riga | Stringa | Tipo | Chiave i18n suggerita |
|------|------|---------|------|----------------------|
| `src/app/[locale]/login/page.tsx` | 39 | `"Sign in to access your dashboard."` | Descrizione card login | `common.loginDescription` |
| `src/app/[locale]/login/page.tsx` | 44 | `Email` (Label) | Etichetta campo | `common.fieldEmail` |
| `src/app/[locale]/login/page.tsx` | 48 | `Password` (Label) | Etichetta campo | `common.fieldPassword` |
| `src/app/[locale]/login/page.tsx` | 64 | `"New here?"` | Testo invito registrazione | `common.loginNewHere` |
| `src/app/[locale]/share/[token]/page.tsx` | 46 | `"Link non disponibile / Link not available"` | Titolo stato errore bilingue | `reports.share.unavailableTitle` |
| `src/app/[locale]/share/[token]/page.tsx` | 47 | `"Il link non e valido o e stato disabilitato."` | Descrizione stato errore | `reports.share.unavailableDescription` |
| `src/app/[locale]/(dashboard)/settings/profile/page.tsx` | 102 | `"Italiano"` | SelectItem lingua | `settings.locales.it` |
| `src/app/[locale]/(dashboard)/settings/profile/page.tsx` | 103 | `"English"` | SelectItem lingua | `settings.locales.en` |
| `src/app/[locale]/settings/billing/BillingClient.tsx` | 70 | `"Downgrade"` | Bottone piano | `billing.downgradeBtn` |
| `src/app/[locale]/settings/billing/BillingClient.tsx` | 70 | `"Upgrade"` | Bottone piano | `billing.upgradeBtn` |
| `src/components/billing/PlanCompareTable.tsx` | 117 | `"Features"` | Intestazione sezione tabella piani | `billing.compare.featuresSection` |
| `src/components/market/competitor-form-dialog.tsx` | 141 | `"Quality (0–100)"` | Label form competitor | `market.competitors.form.qualityScore` |
| `src/components/market/competitor-form-dialog.tsx` | 150 | `"Price (0–100)"` | Label form competitor | `market.competitors.form.pricePosition` |
| `src/components/notifications/notification-prefs.tsx` | 51 | `"Type"` | Intestazione colonna notifiche | `notifications.table.typeHeader` |
| `src/components/notifications/notification-prefs.tsx` | 92 | `"Save"` | Bottone salva | `common.save` |
| `src/components/team/team-manager.tsx` | 86 | `"Upgrade"` | Link CTA upgrade | `common.upgrade` |
| `src/components/team/team-manager.tsx` | 100–101 | `` `${n} members` `` / `` `${n} / ${limit} members` `` | Contatore membri | `team.memberCount` / `team.memberCountWithLimit` |
| `src/components/ai/forecasting/forecast-chart.tsx` | 121 | `"Storico"` | Nome serie grafico forecasting | `forecasting.chart.historicSeries` |
| `src/components/ai/forecasting/forecast-chart.tsx` | 134 | `"Previsione"` | Nome serie grafico forecasting | `forecasting.chart.forecastSeries` |
| `src/components/site-footer.tsx` | 80 | `"Made with Claude"` | Footer attribution | Non tradurre (brand attribution) |

---

## File puliti (già pienamente i18n)

I seguenti file usano correttamente `useTranslations` / `getTranslations` per tutto il testo visibile e non presentano stringhe hardcoded UI-visibili:

- `src/app/[locale]/(dashboard)/finance/page.tsx`
- `src/app/[locale]/(dashboard)/reports/builder/page.tsx`
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx` *(salvo SelectItem lingua, vedi sopra)*
- `src/app/[locale]/(dashboard)/settings/security/page.tsx`
- `src/app/[locale]/(dashboard)/settings/organization/page.tsx`
- `src/app/[locale]/(dashboard)/data/manual/page.tsx`
- `src/components/market/competitor-form-dialog.tsx` *(salvo Quality/Price label, vedi sopra)*
- `src/components/market/swot-matrix.tsx`
- `src/components/billing/CreditsCard.tsx`
- `src/components/billing/CurrentPlanCard.tsx`
- `src/components/billing/PlanCompareTable.tsx` *(salvo "Features" in riga 117)*
- `src/components/notifications/notification-prefs.tsx` *(salvo "Type" e "Save")*
- `src/components/team/team-manager.tsx` *(salvo "Upgrade" e `members` counter)*
- `src/components/onboarding/onboarding-flow.tsx`
- Tutti i file sotto `src/app/[locale]/legal/` *(pagine statiche legali — in inglese by design)*

---

## Piano di intervento

### Tranche 1 — Alta priorità (pagine dashboard principali, viste per prime)

**File target:**
- `src/app/[locale]/(dashboard)/page.tsx`
- `src/app/[locale]/(dashboard)/operations/page.tsx`
- `src/app/[locale]/(dashboard)/operations/customers/page.tsx`
- `src/app/[locale]/(dashboard)/operations/team/page.tsx`

**Stringhe stimate:** ~46

**Namespace da integrare:** `overview` (già esistente in `it.json`), `operations`, `team`, `customers`

**Perché:** Sono le pagine di atterraggio principali della dashboard. Ogni utente le vede immediatamente dopo il login. La pagina overview ha 22 stringhe hardcoded inclusi template literal dinamici (spotlight AI) che producono testo italiano non traducibile.

**Lavori specifici:**
1. Estrarre le 4 azioni rapide in `overview.quickActions.*`
2. Convertire i template literal `aiSpotlight` in chiavi con interpolazione next-intl `{value}` 
3. Aggiungere al namespace `operations` le chiavi `kpi.*` per la LABELS map
4. Estrarre gli header `<th>` delle tabelle team e customers in `team.table.*` / `customers.table.*`

---

### Tranche 2 — Media priorità (sezione Market e componenti billing)

**File target:**
- `src/app/[locale]/(dashboard)/market/page.tsx`
- `src/app/[locale]/(dashboard)/market/competitors/page.tsx`
- `src/app/[locale]/(dashboard)/market/trends/page.tsx`
- `src/app/[locale]/(dashboard)/market/positioning/page.tsx`
- `src/app/[locale]/(dashboard)/operations/efficiency/page.tsx`
- `src/app/[locale]/settings/billing/BillingClient.tsx`
- `src/components/billing/PlanCompareTable.tsx`
- `src/components/notifications/notification-prefs.tsx`

**Stringhe stimate:** ~35

**Namespace da integrare:** `market` (già esistente), `efficiency`, `billing` (già esistente)

**Perché:** La sezione market è la seconda più usata dopo la finance. Le stringhe SWOT hardcoded in `positioning/page.tsx` sono particolarmente rischiose perché dipendono dalla lingua. Il componente `PlanCompareTable` ha "Features" in inglese ma tutto il resto in italiano tramite i18n — incoerenza visibile.

**Lavori specifici:**
1. I QUADRANTS object in `positioning/page.tsx` ha label italiane hardcoded → estrarre in `market.positioning.swot.*`
2. I bullet "suggerimenti" in `market/page.tsx` sono contenuto statico hardcoded in italiano → estrarre o recuperare da API
3. Il nome azienda "TechFlow SRL" in `positioning/page.tsx:63` è un placeholder hardcoded → caricare dal profilo organizzazione via `useSession`
4. Aggiungere `billing.downgradeBtn` e `billing.upgradeBtn` a `it.json`/`en.json`
5. Aggiungere `notifications.table.typeHeader` e usare `common.save`

---

### Tranche 3 — Bassa priorità (login, share, forecasting, team)

**File target:**
- `src/app/[locale]/login/page.tsx`
- `src/app/[locale]/share/[token]/page.tsx`
- `src/components/ai/forecasting/forecast-chart.tsx`
- `src/components/team/team-manager.tsx`
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx`
- `src/components/market/competitor-form-dialog.tsx`

**Stringhe stimate:** ~8

**Namespace da integrare:** `common`, `reports`, `forecasting`, `team`, `settings`, `market`

**Perché:** Impatto minore. La pagina login è visitata raramente dopo il primo accesso. Il forecast chart ha 2 soli nomi di serie. Il competitor form dialog ha 2 label (Quality/Price) già tradotte in parte ma non queste due specifiche.

**Lavori specifici:**
1. Aggiungere al namespace `common`: `loginDescription`, `loginNewHere`, `fieldEmail`, `fieldPassword`, `upgrade`
2. Aggiungere al namespace `reports`: `share.unavailableTitle`, `share.unavailableDescription`
3. Aggiungere al namespace `forecasting`: `chart.historicSeries`, `chart.forecastSeries`
4. Aggiungere al namespace `team`: `memberCount`, `memberCountWithLimit`
5. Nel form competitor, aggiungere `market.competitors.form.qualityScore` e `market.competitors.form.pricePosition`
6. Aggiungere `settings.locales.it` e `settings.locales.en` per SelectItem lingua — oppure usare le API Intl native

---

## Note metodologiche

- Le pagine sotto `src/app/[locale]/legal/` (cookies, privacy, terms) sono intentenzionalmente in inglese (documenti legali) e **non** vanno i18n-izzate nella tranche corrente.
- L'attributo `"Made with Claude"` in `site-footer.tsx` è brand attribution e non va tradotto.
- Le chiavi `name=` nei componenti Recharts (es. `"Churn"`, `"Retention"`, `"NPS"`) appaiono nelle tooltip e legend dei grafici — sono UI-visibili ma spesso in termini tecnici internazionali; valutare caso per caso se tradurre.
- Il campo `"TechFlow SRL"` in `market/positioning/page.tsx:63` è un placeholder demo hardcoded nel codice: va sostituito con il nome dell'organizzazione corrente dall'auth/session, non semplicemente i18n-izzato.
- Zero modifiche a file `.tsx`/`.ts` del codebase sono state effettuate durante questo audit.
