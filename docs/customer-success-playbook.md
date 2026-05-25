---
title: Anlyra · Customer Success Playbook
audience: founder, CS team
last_updated: 2026-05-25
status: living document
---

# Customer Success Playbook

> Come accompagnare un cliente dal primo contatto alla fidelizzazione. Operativo, non teorico.

Documenti correlati: [`onboarding-flow.md`](onboarding-flow.md) (blueprint prodotto), [`FAQ.md`](FAQ.md) (risposte pronte), [`glossary.md`](glossary.md) (termini da spiegare).

---

## 1. Filosofia customer success

Anlyra adotta un modello **ibrido**:

- **White glove** (assistenza ad alto tocco) per prospect Avanzato/Enterprise e per i primi 50 clienti in assoluto. Obiettivo: imparare dai clienti reali, non scalare ancora.
- **Self-service** per il piano Pro a regime: onboarding guidato in-app, documentazione, email automatiche.

Regola pratica nei primi mesi: **tutti i trial ricevono trattamento white glove.** Il costo è alto ma il learning vale di più del tempo speso. Si passa a self-service solo quando i pattern di onboarding sono chiari e ripetibili.

---

## 2. Pre-trial

**Response time target**: prima risposta entro **2 ore lavorative** a qualsiasi richiesta (form, email, chat).

### Qualifying questions

Prima di investire tempo, capisci se il prospect è in target. Cinque domande chiave:

1. Che dati gestisci oggi e dove (Excel, gestionale, software contabile)?
2. Quante persone nel team userebbero Anlyra?
3. Qual è la domanda sui tuoi numeri a cui oggi fatichi a rispondere?
4. Chi prende le decisioni di acquisto software nella tua azienda?
5. C'è una scadenza o un evento che rende questo urgente adesso?

Se le risposte rivelano un'azienda fuori target (es. micro-impresa senza dati strutturati, o multinazionale che cerca BI enterprise), sii onesto: meglio un "no" pulito che un trial destinato al churn.

---

## 3. Trial day 0 — Kickoff call (30 min)

**Tono**: consulente esperto, non venditore. Ascolta più di quanto parli.

### Agenda

| Minuti | Attività |
|--------|----------|
| 0–5 | Rompighiaccio + conferma obiettivo del prospect |
| 5–15 | Demo guidata sui SUOI casi d'uso (non un tour generico) |
| 15–25 | Setup insieme: primo import dati o connessione |
| 25–30 | Definisci il "momento aha" atteso + fissa il check-in day 3 |

### Follow-up

Entro 1 ora dalla call, invia l'email di kickoff (template sotto) con: recap obiettivi, link risorse, prossimo appuntamento.

---

## 4. Trial day 1–3 — Setup support

Obiettivo: il cliente deve avere **dati reali caricati** entro il giorno 3. Senza dati, nessun valore percepito, churn garantito.

- Monitora se ha completato l'import. Se al giorno 2 non l'ha fatto, intervieni proattivamente.
- Offri di fare l'import insieme in una call di 15 minuti.
- Verifica che la prima dashboard mostri numeri sensati (non zeri, non errori di mapping).

---

## 5. Trial day 4–6 — Insight review

Obiettivo: mostrare il **valore unico dell'AI**, ciò che il cliente non vedeva prima.

- Rivedi insieme gli insight generati. Quale lo ha sorpreso?
- Collega un insight a una possibile decisione concreta ("questo trend sui costi logistici, lo sapevi?").
- Se l'AI non ha trovato nulla di interessante, è un segnale: i dati sono troppo pochi o troppo piatti. Aiuta ad arricchirli.

---

## 6. Trial day 7 — Conversion call

**Tono**: assumi la conversione, non chiederla timidamente. Se hai fatto bene i giorni 0–6, questo è naturale.

- Recap del valore emerso durante il trial (usa i loro numeri concreti).
- Chiedi direttamente: "Procediamo con il piano Pro o ti serve l'Avanzato per il team?"
- Gestisci obiezioni con onestà. Prezzo: vedi [`FAQ.md`](FAQ.md) §2.
- Se non è pronto, capisci il vero blocco: prezzo, timing, feature mancante, o decision-maker assente.

---

## 7. Post-conversion — Check-in 30/60/90

| Giorno | Focus | Domanda chiave |
|--------|-------|----------------|
| 30 | Adoption | Stai usando Anlyra settimanalmente? Cosa ti blocca? |
| 60 | Valore | Quale decisione hai preso grazie a un insight? |
| 90 | Espansione + advocacy | Chi altro nel team ne beneficerebbe? Ci consiglieresti? |

Il check-in a 90 giorni è anche il momento per chiedere una testimonianza (vedi [`marketing-copy-library.md`](marketing-copy-library.md) §7).

---

## 8. Churn risk signals

Monitora questi segnali (in ordine di gravità):

- 🔴 **Login frequency in calo**: nessun accesso da 14+ giorni.
- 🔴 **Zero insight views**: paga ma non guarda gli insight generati.
- 🟠 **Nessun nuovo import dati** da 30+ giorni (dati stagnanti = valore decrescente).
- 🟠 **Crediti AI inutilizzati**: usa < 10% dei crediti del piano.
- 🟡 **Ticket di supporto con frustrazione** o domande sul prezzo.
- 🟡 **Riduzione utenti attivi** nel team (era 5, ora 1).

Quando scatta un segnale rosso, contatta entro 48 ore con un'offerta di aiuto concreta, non un generico "tutto ok?".

---

## 9. Save attempts — Cliente che vuole cancellare

1. **Ascolta prima di reagire.** Capisci il motivo reale (prezzo, valore, bug, cambio aziendale).
2. **Non offrire subito sconti.** Lo sconto svaluta il prodotto e non risolve un problema di valore.
3. **Se è un problema di valore**: proponi una call per riconfigurare l'uso. Spesso non sfruttano funzioni chiave.
4. **Se è un problema di prezzo reale**: valuta downgrade a un piano inferiore prima di perderlo del tutto.
5. **Se la decisione è presa**: lascia andare con grazia. Offri export dati (vedi [`SECURITY.md`](SECURITY.md)), chiedi feedback onesto, lascia la porta aperta.

Un churn gestito bene può tornare cliente. Un churn gestito male non torna mai e parla male.

---

## 10. Expansion — Riconoscere upgrade-ready (Pro → Avanzato)

Segnali che un cliente Pro è pronto per l'Avanzato:

- Ha raggiunto il limite di **5 utenti** e chiede di aggiungerne altri.
- Esaurisce regolarmente i **200 crediti AI** mensili (acquista credit pack ripetutamente).
- Chiede funzionalità di **collaborazione** (commenti, condivisione strutturata).
- Il team è cresciuto o l'azienda ha più reparti che vogliono accesso.

Approccio: non spingere l'upgrade come vendita, presentalo come soluzione a un limite che stanno già toccando.

---

## Template email

### Kickoff trial — Day 0

```
Oggetto: Benvenuto in Anlyra — i prossimi passi

Ciao [Nome],

grazie per il tempo di oggi. Come anticipato, ecco il piano per i tuoi 7 giorni di prova:

• Obiettivo che ci siamo dati: [obiettivo concreto emerso in call]
• Primo passo: caricare i dati di [tipo dato] — guida qui: [link]
• Ci risentiamo: [data check-in day 3]

Per qualsiasi cosa, rispondi a questa email: leggo io direttamente.

A presto,
[Nome founder]
```

### Check-in — Day 3

```
Oggetto: Come va con Anlyra?

Ciao [Nome],

volevo assicurarmi che il setup sia filato liscio. Hai già caricato i primi dati?

Se qualcosa non torna (mapping colonne, primo insight), fissiamo 15 minuti e lo sistemiamo insieme: [link calendario].

[Nome founder]
```

### Conversion ask — Day 6

```
Oggetto: Domani finisce la prova — facciamo il punto

Ciao [Nome],

domani si chiude il trial. In questi giorni Anlyra ti ha mostrato [insight/valore concreto emerso].

Per continuare senza interruzioni: [link al piano]. Se hai dubbi sul piano giusto per il tuo team, rispondi qui e ne parliamo.

[Nome founder]
```

### Feedback request — Day 30

```
Oggetto: Un favore: 3 minuti del tuo tempo

Ciao [Nome],

sei con noi da un mese. Mi aiuteresti con due domande veloci?

1. Qual è la cosa più utile che Anlyra ti ha fatto scoprire?
2. Cosa miglioreresti subito?

Le tue risposte vanno dritte nella roadmap ([link a roadmap.md pubblica]).

Grazie,
[Nome founder]
```

---

**Status**: living document. Aggiornato man mano che impariamo dai clienti reali.
