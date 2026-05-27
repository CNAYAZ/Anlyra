---
title: Anlyra · Onboarding Email Sequence
audience: marketing / Customer Success (drip post-signup)
status: living document
last_updated: 2026-05-27
---

# Onboarding Email Sequence

> Sequenza drip dal signup al giorno 90. Contenuti pronti per essere implementati nei template email
> esistenti. Tono allineato a [`brand-guidelines.md`](../brand-guidelines.md): calore professionale,
> mai spam, ogni email con un solo obiettivo chiaro.

**Documenti correlati**: [`onboarding-flow.md`](../onboarding-flow.md),
[`customer-success-playbook.md`](../customer-success-playbook.md),
[`marketing-copy-library.md`](../marketing-copy-library.md).

**Nota implementazione**: i template tecnici vivono in `src/lib/email/templates/`. Questo documento
è il *contenuto editoriale*; alcuni invii (welcome, verify) sono già implementati, gli altri sono
pianificati.

---

## Day 1 — Welcome (verify email) · [implementato]

- **Subject**: "Conferma la tua email per iniziare"
- **Opening**: "Ciao [Nome], benvenuto in Anlyra."
- **Body**:
  - Un click e sei dentro.
  - Conferma l'indirizzo per attivare l'account.
- **CTA**: "Conferma email"
- **Sign-off**: "Il team Anlyra"

---

## Day 1 — Welcome (verified, full) · [implementato]

- **Subject**: "Sei dentro! Ecco come iniziare"
- **Opening**: "Account attivo. Ora la parte interessante."
- **Body**:
  - Carica i tuoi primi dati (bastano un Excel/CSV).
  - In 5 minuti vedi i primi insight.
  - Hai 7 giorni di prova completa.
- **CTA**: "Vai alla dashboard"
- **Sign-off**: "A presto, il team Anlyra"

---

## Day 2 — First insight tutorial

- **Subject**: "Come leggere il tuo primo insight"
- **Opening**: "Hai già i primi numeri. Ma cosa significano?"
- **Body**:
  - Ogni insight ha un titolo, una spiegazione e un'azione.
  - Il livello di confidenza ti dice quanto fidarti.
  - Clicca un insight per vedere i dati che l'hanno generato.
- **CTA**: "Apri i tuoi insight"
- **Sign-off**: "Buona scoperta"

---

## Day 3 — Best practice 1: data sources

- **Subject**: "Più dati = insight migliori"
- **Opening**: "Anlyra è bravo quanto i dati che gli dai."
- **Body**:
  - Aggiungi fatturato, costi e cassa per il quadro completo.
  - Più storico carichi, più i trend diventano affidabili.
- **CTA**: "Aggiungi una fonte dati"
- **Sign-off**: "Il team Anlyra"

---

## Day 5 — Best practice 2: dashboard customization

- **Subject**: "Costruisci la tua dashboard ideale"
- **Opening**: "Ogni azienda guarda numeri diversi."
- **Body**:
  - Scegli i KPI che contano per te (vedi i 48 disponibili).
  - Riordina i widget, salva la tua vista.
- **CTA**: "Personalizza la dashboard"
- **Sign-off**: "Su misura per te"

---

## Day 7 — Trial halfway check

- **Subject**: "Metà prova: come sta andando?"
- **Opening**: "Sei a metà dei 7 giorni. Tutto chiaro?"
- **Body**:
  - Se qualcosa non torna, rispondi a questa email: leggiamo davvero.
  - Vuoi una mano a configurare? Prenota 15 minuti con noi.
- **CTA**: "Prenota una call veloce"
- **Sign-off**: "Siamo qui, il team Anlyra"

---

## Day 10 — Feature spotlight: AI alerts

- **Subject**: "Fatti avvisare prima che sia tardi"
- **Opening**: "Gli alert AI tengono d'occhio i tuoi numeri per te."
- **Body**:
  - Cassa in calo, margini sotto soglia, churn anomalo: te lo diciamo noi.
  - Imposta le soglie una volta, dormi sonni tranquilli.
- **CTA**: "Configura gli alert"
- **Sign-off**: "Il team Anlyra"

---

## Day 14 — Trial reminder

- **Subject**: "3 giorni alla fine della prova"
- **Opening**: "La tua prova sta per finire, [Nome]."
- **Body**:
  - Continua senza interruzioni scegliendo un piano.
  - Pro per team piccoli, Avanzato per chi cresce.
  - Export sempre disponibile: nessun lock-in.
- **CTA**: "Scegli il tuo piano"
- **Sign-off**: "Speriamo di restare al tuo fianco"

---

## Day 21 — Power user tips (post-conversion)

- **Subject**: "3 trucchi che usano i nostri utenti migliori"
- **Opening**: "Ora che sei a bordo, sblocca il massimo."
- **Body**:
  - Confronta periodi per vedere i trend reali.
  - Usa i forecast per pianificare la cassa.
  - Esporta i report per il commercialista in un click.
- **CTA**: "Prova una funzione avanzata"
- **Sign-off**: "Il team Anlyra"

---

## Day 30 — NPS survey

- **Subject**: "Una domanda veloce (30 secondi)"
- **Opening**: "Da 0 a 10, ci consiglieresti a un collega imprenditore?"
- **Body**:
  - Il tuo voto ci aiuta a migliorare davvero.
  - C'è spazio per dirci il perché — leggiamo tutto.
- **CTA**: "Dai il tuo voto"
- **Sign-off**: "Grazie, il team Anlyra"

---

## Day 60 — Expansion opportunity

- **Subject**: "Porta il tuo team su Anlyra"
- **Opening**: "Le decisioni migliori si prendono insieme."
- **Body**:
  - Invita colleghi e condividete le stesse dashboard.
  - Gestisci più aziende? Aggiungi una seconda organizzazione.
- **CTA**: "Invita il team"
- **Sign-off**: "Cresciamo insieme"

---

## Day 90 — Loyalty milestone

- **Subject**: "3 mesi insieme. Grazie."
- **Opening**: "Sono 90 giorni che usi Anlyra, [Nome]. Significa molto per noi."
- **Body**:
  - Continua a dirci cosa migliorare.
  - Conosci un imprenditore che ne avrebbe bisogno? Presentaci.
- **CTA**: "Segnala un collega"
- **Sign-off**: "Con gratitudine, il team Anlyra"

---

## Note operative

- **Un solo CTA per email**: niente confusione.
- **Subject < 50 caratteri**: leggibilità mobile.
- **Stop on conversion/churn**: le email post-trial cambiano in base allo stato (paid vs lapsed).
- **Tono**: mai pressante. Brand value "Onestà radicale" vale anche nel drip.

---

**Status**: living document.  
**Last updated**: 2026-05-27.  
**Audience**: marketing / CS.
