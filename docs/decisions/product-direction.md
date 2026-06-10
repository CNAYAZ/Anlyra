# PRODUCT-001 — Direzione prodotto: dal suggerimento fornitori all'orchestrazione AI

| Campo | Valore |
|---|---|
| ID | PRODUCT-001 |
| Data | 2026-06-10 |
| Stato | **APERTA, in validazione** |
| Owner | founder |

---

## Scoperta (colloquio reale con PMI)

Feedback diretto ricevuto durante un'intervista con una PMI reale:

> "Ho già fornitori fidati con sconti fedeltà, non mi servono prezzi migliori."

Questa risposta **invalida l'ipotesi** su cui era impostata una parte della proposta di valore:
"Anlyra suggerisce fornitori migliori". Il cliente non vuole cambiare fornitori — ha già le sue relazioni consolidate e non è disposto a rinunciarci per risparmiare qualcosa.

---

## Tesi a 2 livelli

### Livello 1 — Da "sostituire i fornitori" a "ridurre l'attrito"

Invece di suggerire fornitori alternativi, automatizzare il **riordino dai fornitori che il cliente GIÀ ha**.

Il flusso proposto:
1. L'AI stima il fabbisogno dal lavoro acquisito.
2. Prepara l'ordine in bozza.
3. Lo propone via **WhatsApp o email precompilati** (i fornitori PMI non hanno API).
4. **L'umano approva sempre** — MAI ordini automatici coi soldi del cliente.

### Livello 2 — "AI come colla"

Le funzioni necessarie esistono già, anche gratis, ma sono **frammentate e fatte a mano**.

Anlyra = **orchestrazione AI che unifica l'esistente**. NON 100 funzioni nuove.

---

## Piano di validazione

### Campione
Interviste a **8-10 PMI** col kit del founder (`anlyra-market-validation-kit.md`, fuori repo).

### Soglia decisionale
- **5-6/10** confermano dolore + disponibilità a pagare → si costruisce il primo pezzo
  (probabile: stima fabbisogno + preparazione ordine)
- **1-2/10** → focus su analytics

### Domande chiave per le interviste
1. Come gestisci il riordino oggi?
2. Quanto tempo perdi? Ordini mai troppo o troppo poco?
3. Useresti un sistema che dice cosa e quando riordinare dai **TUOI** fornitori?
4. Preferisci automatico o con approvazione prima dell'invio?
5. Che canale usi oggi con i fornitori (telefono / email / portale)?

---

## Vincolo esplicito

**NIENTE sviluppo del pivot prima dell'esito delle interviste.**

Nessuna nuova feature legata a questa direzione va in codice finché la validazione non
raggiunge la soglia. Il codice esistente (analytics, insights, finance) rimane l'offerta
attuale durante la fase di validazione.
