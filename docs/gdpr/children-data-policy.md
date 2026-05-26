---
title: Anlyra · Children Data Policy
audience: legal, DPO, product team
last_updated: 2026-05-26
status: living document
---

# Children Data Policy

> Policy di Anlyra sul trattamento dei dati di minori. Conforme a GDPR art. 8, D.Lgs. 196/2003 (Codice Privacy italiano) e D.Lgs. 101/2018 (adeguamento GDPR italiano).

**Correlati**: [`subprocessor-list.md`](subprocessor-list.md), `docs/legal/privacy-policy.md`.

---

## 1. Posizione di Anlyra

**Anlyra è un servizio B2B destinato esclusivamente a professionisti adulti.**

Il target sono imprenditori, manager e professionisti che gestiscono PMI italiane. Il servizio non è progettato per, né intende raccogliere dati di, persone di età inferiore ai 18 anni.

---

## 2. Età minima per la registrazione

- **Età minima dichiarata**: 18 anni.
- Al momento della registrazione, l'utente dichiara di avere almeno 18 anni tramite checkbox esplicita:
  _"Confermo di avere almeno 18 anni e di utilizzare Anlyra in qualità di professionista o imprenditore."_
- La dichiarazione è auto-certificata (self-service). Anlyra non effettua verifica dell'età tramite documenti.

**Nota GDPR**: l'art. 8 GDPR fissa a 16 anni il limite per i servizi della società dell'informazione (salvo deroga nazionale fino a 13 anni). L'Italia non ha abbassato questo limite. Anlyra adotta 18 anni come policy più conservativa, coerente con il target professionale.

---

## 3. Nessuna raccolta intenzionale di dati di minori

Anlyra non raccoglie intenzionalmente dati personali relativi a persone di età inferiore ai 18 anni. In particolare:

- Il processo di registrazione richiede la dichiarazione di maggiore età.
- Il servizio non include funzionalità orientate a minori (giochi, contenuti educativi per bambini, ecc.).
- I contenuti del sito e della dashboard sono orientati a professionisti adulti.

---

## 4. Presenza incidentale di dati di minori

Anlyra riconosce che i dati caricati dai clienti (es. file CSV, dati gestionali) potrebbero **incidentalmente** contenere riferimenti a persone minorenni, ad esempio:

- Dipendenti minorenni (in contesti di stage, tirocinio) nei dati HR.
- Clienti minorenni dell'organizzazione cliente.
- Familiari citati in dati contabili.

**Posizione**: Anlyra processa questi dati **nella qualità di responsabile del trattamento** (processor), non di titolare. Il cliente (controller) è responsabile della liceità del proprio trattamento verso i minori nei propri sistemi. Anlyra si limita a processare i dati che il cliente decide di caricare, secondo le istruzioni del cliente.

Tuttavia, Anlyra adotta misure di minimizzazione anche in questo contesto (vedi sezione 6).

---

## 5. Procedura in caso di rilevamento

Se Anlyra viene a conoscenza, con qualsiasi mezzo, che un account appartiene o è stato creato da un minore di 18 anni:

1. **Sospensione immediata** dell'account (entro 24 ore dalla segnalazione).
2. **Notifica** all'indirizzo email associato all'account.
3. **Cancellazione dei dati** associati all'account entro 30 giorni, salvo obblighi legali che impongano la conservazione.
4. **Nessuna condivisione** dei dati del minore con terze parti.
5. **Log dell'evento** per documentazione interna.

---

## 6. Misure di minimizzazione

Per ridurre il rischio di trattamento incidentale di dati relativi a minori:

- **Minimizzazione nei prompt AI**: Anlyra invia ad Anthropic dati aggregati e, dove possibile, pseudonimizzati — riducendo la probabilità che dettagli identificativi di individui (inclusi minori) vengano trasmessi.
- **Data import guidance**: la documentazione per l'importazione CSV suggerisce di anonimizzare i dati personali prima del caricamento.
- **No processing per finalità incompatibili**: i dati caricati vengono usati esclusivamente per le finalità dichiarate (analytics, insight, forecast) — non per profilazione o marketing.

---

## 7. Segnalazione

Per segnalare la presenza di dati di minori su Anlyra, o per esercitare i diritti di cui all'art. 17 GDPR (diritto alla cancellazione) per conto di un minore:

**Email**: privacy@anlyra.it  
**Oggetto suggerito**: "Segnalazione dati minore"  
**Risposta**: entro 72 ore, con conferma delle azioni intraprese.

---

## 8. Riferimenti normativi

- **GDPR art. 8** — Condizioni applicabili al consenso dei minori in relazione ai servizi della società dell'informazione.
- **GDPR art. 17** — Diritto alla cancellazione ("diritto all'oblio").
- **D.Lgs. 196/2003** — Codice in materia di protezione dei dati personali (Codice Privacy italiano).
- **D.Lgs. 101/2018** — Disposizioni per l'adeguamento della normativa nazionale alle disposizioni del GDPR.
- **Provvedimento Garante n. 426/2021** — Linee guida sull'età minima per i servizi digitali.

---

## 9. Revisione e responsabilità

- **Owner**: DPO esterno consulente (da nominare pre-launch), supportato dal founder.
- **Revisione**: annuale o in caso di modifica normativa.
- **Prossima revisione**: maggio 2027.

---

**Status**: living document. Validare con il DPO una volta nominato. Aggiornare se cambiano le normative o le funzionalità del prodotto che potrebbero impattare il trattamento di dati di minori.
