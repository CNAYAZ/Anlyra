---
title: Anlyra · Incident Response Playbook
audience: operational team
last_updated: 2026-05-25
status: living document
---

# Incident Response Playbook

> Cosa fare quando qualcosa si rompe in produzione. Calma, processo, comunicazione.

Documenti correlati: [`SECURITY.md`](SECURITY.md) (security posture), [`status-page-content.md`](status-page-content.md) (comunicazione pubblica), [`DEPLOY.md`](DEPLOY.md) (rollback).

---

## 1. Severity classification

| Severità | Definizione | SLA prima risposta | Esempio |
|----------|-------------|--------------------|---------|
| **P0** | Servizio down per tutti, o data breach | 15 min, 24/7 | Sito irraggiungibile, DB compromesso |
| **P1** | Funzione critica rotta per molti | 1 ora | Checkout non funziona, login fallisce |
| **P2** | Funzione degradata, workaround esiste | 4 ore lavorative | AI insights lenti, una dashboard rotta |
| **P3** | Problema minore, cosmetico | 2 giorni lavorativi | Typo, allineamento UI |

In caso di dubbio sulla classificazione, **alza la severità**. È meglio sovrastimare un P2 come P1 che il contrario.

---

## 2. On-call rotation policy

**Stato attuale**: il founder è on-call 24/7 (fase pre-launch, team di una persona).

**Stato futuro** (post-hire): rotazione settimanale con almeno 2 ingegneri, handoff il lunedì mattina, escalation secondaria definita. Strumento target: PagerDuty o Better Stack on-call.

Regola: chi è on-call deve avere accesso a Vercel, Supabase, Stripe dashboard e al repo da mobile.

---

## 3. Communication channels

| Canale | Uso |
|--------|-----|
| Slack `#incidents` | Coordinamento interno (futuro team) |
| Status page (status.anlyra.it) | Comunicazione pubblica clienti |
| Email diretta | Clienti Enterprise / impatto su singolo account |
| LinkedIn/Twitter | Solo per outage maggiori prolungati |

Principio: **comunica prima di avere la soluzione.** Un "stiamo investigando" tempestivo vale più di un silenzio seguito da una spiegazione completa.

---

## 4. Incident response timeline

| Fase | Tempo | Azioni |
|------|-------|--------|
| **Detect + Ack** | 0–5 min | Riconosci l'incident. Apri canale. Assegna un incident lead. |
| **Triage + Classify** | 5–15 min | Determina severità (§1). Stima impatto (quanti utenti). Pubblica primo update su status page. |
| **Mitigate** | 15–60 min | Ferma l'emorragia. Rollback se necessario (vedi [`DEPLOY.md`](DEPLOY.md)). La mitigazione viene prima della root cause. |
| **Resolve** | 1–24h | Fix definitivo. Verifica. Conferma con monitoring che è risolto. |
| **Postmortem** | 24–72h | Analisi (§9). Action items. Comunicazione finale. |

---

## 5. Communication templates

### Status page — Investigating

```
[INVESTIGANDO] Stiamo riscontrando problemi con [componente].
Gli utenti potrebbero notare [sintomo]. Stiamo indagando e
forniremo un aggiornamento entro [tempo].
```

### Email customer — impatto diretto

```
Oggetto: Aggiornamento sul servizio Anlyra

Ciao [Nome],

tra le [ora] e le [ora] hai potuto riscontrare [problema].
La causa era [spiegazione semplice]. È ora risolto.

I tuoi dati non sono stati interessati. [oppure: dettaglio impatto dati]

Ci scusiamo per il disagio. Per domande, rispondi pure qui.

Il team Anlyra
```

### Social — outage maggiore

```
Stiamo riscontrando un disservizio su Anlyra e ci stiamo
lavorando con priorità massima. Aggiornamenti in tempo reale:
status.anlyra.it. Grazie per la pazienza.
```

---

## 6. GDPR breach — Notifica 72h

In caso di **violazione di dati personali**:

1. **Documenta immediatamente**: cosa, quando, quanti soggetti, quali categorie di dati.
2. **Valuta il rischio** per i diritti e le libertà degli interessati.
3. **Notifica al Garante Privacy entro 72 ore** dalla scoperta, se il rischio non è improbabile (art. 33 GDPR).
4. **Notifica agli interessati** senza ingiustificato ritardo, se il rischio è elevato (art. 34 GDPR).
5. Coinvolgi il DPO (vedi [`privacy-dpia-template.md`](privacy-dpia-template.md)).

Il timer delle 72 ore parte dalla **scoperta**, non dalla risoluzione. Non aspettare di aver risolto per notificare.

---

## 7. Security incident — Responsible disclosure

Se l'incident deriva da una vulnerabilità segnalata esternamente:

- Ringrazia chi ha segnalato, non metterti sulla difensiva.
- Conferma ricezione entro 24h (vedi `SECURITY.md` §4.3 per il processo di disclosure).
- Concorda una timeline di fix e disclosure pubblica.
- Non divulgare dettagli tecnici finché il fix non è in produzione.

---

## 8. Tono nella comunicazione customer-facing

Tre principi:

- **Apologetic ma non servile**: scusati una volta, sinceramente, poi concentrati sull'azione.
- **Transparent**: di' cosa è successo in termini comprensibili, senza gergo difensivo.
- **Action-oriented**: chiudi sempre con cosa stai facendo o cosa il cliente deve fare.

Evita: "potrebbe essersi verificato un possibile disservizio". Preferisci: "il login non ha funzionato per circa 20 minuti. È risolto."

---

## 9. Postmortem template

```
# Postmortem — [Titolo incident]

**Data**: [data]
**Durata**: [inizio – fine]
**Severità**: [P0–P3]
**Autore**: [nome]

## Impatto
[Quanti utenti, quali funzioni, perdita dati sì/no, impatto revenue]

## Timeline
[HH:MM] — evento
[HH:MM] — evento

## Root cause (5 whys)
1. Perché è successo? →
2. Perché? →
3. Perché? →
4. Perché? →
5. Perché? → [causa radice]

## Cosa è andato bene
-

## Cosa è andato male
-

## Action items
| Azione | Owner | Deadline |
|--------|-------|----------|
| | | |
```

Regola d'oro del postmortem: **blameless**. Si analizzano sistemi e processi, non si cercano colpevoli. Un postmortem accusatorio insegna solo a nascondere gli errori.

---

## 10. Lessons learned log

Archivio cronologico dei postmortem, con il pattern emerso. Da rivedere ogni trimestre per identificare debolezze sistemiche ricorrenti.

| Data | Incident | Severità | Lezione chiave | Action status |
|------|----------|----------|----------------|---------------|
| — | *(nessun incident in produzione registrato — pre-launch)* | — | — | — |

---

**Status**: living document. La rotazione on-call e i canali si evolvono con la crescita del team.
