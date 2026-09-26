import { PLANS, CREDIT_PACKS, isUnlimited } from '@/lib/billing/plans';

export const dynamic = 'force-static';
export const revalidate = 3600;

/**
 * /llms.txt — a plain-text description of Anlyra for AI assistants (ChatGPT,
 * Claude, Perplexity, ...) to read when a visitor asks them about the
 * product, instead of guessing. Prices and plan limits are read from
 * PLANS (src/lib/billing/plans.ts) — the same source the pricing page reads
 * — so this can never drift from what the product actually charges and
 * includes. Everything else here is written by hand and must stay verified
 * against the code, not against marketing copy.
 */

// Manual thousands grouping instead of toLocaleString: this runtime's ICU
// data returns "1490" (no separator at all) for the 'it-IT' locale — verified
// directly (toLocaleString('de-DE')/('en-US') group correctly, 'it-IT' does
// not) — so it cannot be trusted here. Every price in PLANS is a whole euro
// amount today, so integer-only grouping is enough.
function groupThousands(value: number, separator: string): string {
  return Math.trunc(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function eur(cents: number): string {
  return groupThousands(cents / 100, '.');
}

function eurEn(cents: number): string {
  return groupThousands(cents / 100, ',');
}

// Every plan/limit fragment is written as its own sentence (capital letter,
// trailing period) so the joined line reads as prose, not a data dump.
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function planLine(id: 'PRO' | 'ADVANCED' | 'ENTERPRISE'): string {
  const p = PLANS[id];
  const price = p.contact ? 'Prezzo su richiesta' : `€${eur(p.pricing.monthlyCents)}/mese (o €${eur(p.pricing.yearlyCents)}/anno)`;
  const seats = isUnlimited(p.limits.users)
    ? 'Persone illimitate'
    : p.limits.freeViewers > 0
      ? `${p.limits.users} persona con accesso completo + ${p.limits.freeViewers} in sola lettura gratuita`
      : `Fino a ${p.limits.users} persone`;
  const orgs = isUnlimited(p.limits.orgs) ? 'Aziende illimitate' : `${p.limits.orgs} azienda`;
  const credits = isUnlimited(p.limits.aiCredits) ? 'Crediti AI illimitati' : `${p.limits.aiCredits} crediti AI al mese`;
  return `${id === 'ADVANCED' ? 'Avanzato' : id === 'ENTERPRISE' ? 'Enterprise' : 'Pro'}: ${price}. ${cap(seats)}. ${cap(orgs)}. ${cap(credits)}.`;
}

function planLineEn(id: 'PRO' | 'ADVANCED' | 'ENTERPRISE'): string {
  const p = PLANS[id];
  const price = p.contact ? 'Custom pricing' : `€${eurEn(p.pricing.monthlyCents)}/month (or €${eurEn(p.pricing.yearlyCents)}/year)`;
  const seats = isUnlimited(p.limits.users)
    ? 'Unlimited people'
    : p.limits.freeViewers > 0
      ? `${p.limits.users} person with full access + ${p.limits.freeViewers} free read-only seat`
      : `Up to ${p.limits.users} people`;
  const orgs = isUnlimited(p.limits.orgs) ? 'Unlimited companies' : `${p.limits.orgs} company`;
  const credits = isUnlimited(p.limits.aiCredits) ? 'Unlimited AI credits' : `${p.limits.aiCredits} AI credits per month`;
  return `${id === 'ADVANCED' ? 'Advanced' : id === 'ENTERPRISE' ? 'Enterprise' : 'Pro'}: ${price}. ${cap(seats)}. ${cap(orgs)}. ${cap(credits)}.`;
}

const creditPacksLine = CREDIT_PACKS.map((p) => `${p.credits} crediti per €${eur(p.priceCents)}`).join(', ');
const creditPacksLineEn = CREDIT_PACKS.map((p) => `${p.credits} credits for €${eurEn(p.priceCents)}`).join(', ');

const IT = `
== ITALIANO ==

Anlyra: consulente AI per PMI italiane
=======================================

Anlyra è un servizio SaaS di analisi finanziaria per piccole e medie
imprese italiane. Legge i dati reali dell'azienda (entrate, spese,
crediti da incassare, spese ricorrenti, previsioni) e li presenta in
dashboard, report e in una chat con un assistente AI (Claude, di
Anthropic), ancorata a quei numeri reali — non a stime generiche.
Gestito da Lena di Ipek Mikail, ditta individuale (P.IVA 04275010363).

FUNZIONI CHE ESISTONO DAVVERO OGGI
-----------------------------------
- Importazione dati da file Excel/CSV (per esempio l'estratto conto).
- Analisi di ricavi, costi, flusso di cassa e budget.
- Scadenzario dei crediti da incassare, con solleciti via email.
- Gestione delle spese ricorrenti.
- Alert sui numeri dell'azienda, controllati manualmente (non spinti
  in automatico — l'utente li aggiorna con un clic).
- Previsioni (forecasting) fino a 12 mesi, con modelli statistici
  (lineare, media mobile, esponenziale) sui dati storici. Gratuite:
  non consumano crediti AI.
- Report in PDF; sui piani superiori anche report inviati in
  automatico via email e link pubblici di condivisione.
- Dashboard personalizzabili (piani superiori).
- Assistente AI in chat su tutti i piani; un "agente AI" per analisi
  più approfondite sui piani superiori.
- Benchmark di settore: valori di riferimento STATICI (non calcolati
  sui dati aggregati dei clienti Anlyra).
- Ruoli per le persone del team: proprietario, admin, editor, lettore
  (sola lettura).

PIANI (prezzi IVA esclusa, regime forfetario)
-----------------------------------------------
${planLine('PRO')}
${planLine('ADVANCED')}
${planLine('ENTERPRISE')}
Tutti i piani includono: import dati, analisi finanziarie, scadenzario,
spese ricorrenti, alert, previsioni, report PDF, chat AI.
In più dal piano Avanzato: report automatici via email, link di
condivisione dei report, dashboard personalizzate, agente AI.
Solo Enterprise: più aziende sotto un solo accesso.
Pacchetti di crediti AI aggiuntivi, senza scadenza: ${creditPacksLine}.

PROVA GRATUITA
---------------
7 giorni, nessuna carta di credito richiesta. Alla scadenza: nessun
addebito automatico. L'account passa in sola lettura (non si possono
più usare le funzioni AI né aggiungere nuovi dati) finché non si
sceglie un piano. I dati non vengono cancellati.

RIMBORSI
---------
Rimborso entro 14 giorni dal primo pagamento, SOLO in caso di un
problema tecnico che non si è riusciti a risolvere. Non per cambio
idea o uso normale del servizio. Si richiede via email; ogni caso è
valutato singolarmente.

COSA ANLYRA NON FA OGGI (importante: non darlo per scontato)
---------------------------------------------------------------
- Nessuna sincronizzazione bancaria automatica: i dati si importano a
  mano, caricando il file dell'estratto conto (Excel/CSV).
- Nessuna integrazione con software esterni è attiva oggi (Stripe dati,
  QuickBooks, Xero, Salesforce, HubSpot, Google Analytics, Shopify
  compaiono nel prodotto ma rispondono tutte "non disponibile").
- Le previsioni NON sono una garanzia: sono un calcolo statistico sui
  dati storici, non una promessa sul futuro dell'azienda.
- Nessun tempo di risposta del supporto è promesso, su nessun piano.
- Nessun SSO/SAML, nessun accesso API pubblico, nessuna installazione
  on-premise, nessun DPA personalizzato, nessun account manager
  dedicato, nessuna disponibilità del servizio garantita per contratto.
- Le sezioni "Mercato" (analisi competitor) e "Operations" non sono
  raggiungibili dal prodotto oggi: erano dimostrazioni con dati non
  reali, disattivate.

CONTATTI
---------
Per qualunque domanda non trovi risposta qui: contact@anlyra.com
`;

const EN = `
== ENGLISH ==

Anlyra: AI-powered financial advisor for small businesses
============================================================

Anlyra is a SaaS financial-analysis service for Italian small and
medium businesses. It reads the company's real data (revenue, costs,
receivables, recurring expenses, forecasts) and presents it in
dashboards, reports, and a chat with an AI assistant (Claude, by
Anthropic), grounded in those real numbers — not generic estimates.
Operated by Lena di Ipek Mikail, a sole proprietorship (Italian VAT
04275010363).

FEATURES THAT ACTUALLY EXIST TODAY
------------------------------------
- Data import from Excel/CSV files (e.g. a bank statement export).
- Revenue, cost, cash-flow and budget analysis.
- Receivables schedule, with email reminders.
- Recurring expense tracking.
- Alerts on the company's numbers, checked manually (not pushed
  automatically — the user refreshes them with one click).
- Forecasting up to 12 months, using statistical models (linear,
  moving average, exponential) on historical data. Free: does not
  consume AI credits.
- PDF reports; on higher plans, also reports sent automatically by
  email and public share links.
- Custom dashboards (higher plans).
- AI assistant chat on every plan; an "AI Agent" for deeper analysis
  on higher plans.
- Industry benchmarks: STATIC reference values (not calculated from
  Anlyra customers' aggregated data).
- Team roles: owner, admin, editor, viewer (read-only).

PLANS (prices exclude VAT, Italian flat-rate tax regime)
------------------------------------------------------------
${planLineEn('PRO')}
${planLineEn('ADVANCED')}
${planLineEn('ENTERPRISE')}
Every plan includes: data import, financial analysis, receivables
schedule, recurring expenses, alerts, forecasting, PDF reports, AI chat.
Advanced and up also include: reports sent automatically by email,
shareable report links, custom dashboards, AI Agent.
Enterprise only: multiple companies under one login.
Additional AI credit packs, no expiry: ${creditPacksLineEn}.

FREE TRIAL
-----------
7 days, no credit card required. When it ends: nothing is charged
automatically. The account switches to read-only (AI features and
adding new data are paused) until a plan is chosen. No data is
deleted.

REFUNDS
--------
Refund within 14 days of the first payment, ONLY for a technical
problem that could not be resolved. Not for a change of mind or
ordinary use of the service. Requested by email; every case is
reviewed individually.

WHAT ANLYRA DOES NOT DO TODAY (important: do not assume otherwise)
-----------------------------------------------------------------------
- No automatic bank sync: data is imported by hand, by uploading a
  bank statement file (Excel/CSV).
- No third-party integration is active today (Stripe data, QuickBooks,
  Xero, Salesforce, HubSpot, Google Analytics and Shopify appear in
  the product but all answer "not available").
- Forecasts are NOT a guarantee: they are a statistical calculation on
  historical data, not a promise about the company's future.
- No support response time is promised, on any plan.
- No SSO/SAML, no public API access, no on-premise deployment, no
  custom DPA, no dedicated account manager, no contractually
  guaranteed uptime.
- The "Market" (competitor analysis) and "Operations" sections are not
  reachable in the product today: they were demo engines with
  non-real data, now disabled.

CONTACT
--------
For anything not answered here: contact@anlyra.com
`;

export async function GET() {
  return new Response(`${IT.trim()}\n\n\n${EN.trim()}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
