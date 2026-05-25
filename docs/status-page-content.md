---
title: Anlyra · Status Page Content
audience: ops team (setup futuro status.anlyra.it)
last_updated: 2026-05-25
status: planning document
---

# Status Page Content

> Contenuti e configurazione per la futura status page pubblica (status.anlyra.it).

**Stato**: pianificato (roadmap Q3 2026, vedi [`roadmap.md`](roadmap.md)). Questo documento prepara i contenuti. Correlato: [`incident-response-playbook.md`](incident-response-playbook.md).

---

## 1. Components monitorati

| Component | Cosa rappresenta | Dipendenza |
|-----------|------------------|------------|
| Web App | Il sito e la dashboard (anlyra.it) | Vercel |
| API | Le route handler (api.anlyra.it) | Vercel |
| Database | Persistenza dati | Supabase Postgres |
| AI Insights | Generazione insight/forecast | Anthropic Claude |
| Email Delivery | Email transazionali | Resend |
| Payments | Checkout e abbonamenti | Stripe |
| Authentication | Login e sessioni | NextAuth *(post-FASE D)* |

Ogni component ha uno stato indipendente: un'interruzione su "AI Insights" non deve far apparire down l'intera piattaforma.

---

## 2. Status definitions

| Stato | Colore | Significato |
|-------|--------|-------------|
| Operational | 🟢 Verde | Tutto funziona normalmente |
| Degraded performance | 🟡 Giallo | Funziona ma più lento del normale |
| Partial outage | 🟠 Arancione | Una parte del servizio è inaccessibile |
| Major outage | 🔴 Rosso | Il servizio è giù per la maggior parte degli utenti |
| Under maintenance | 🔵 Blu | Manutenzione programmata in corso |

La manutenzione programmata va annunciata con almeno 48 ore di anticipo quando possibile.

---

## 3. Subscription channels

Come i clienti possono iscriversi agli aggiornamenti:

| Canale | Disponibilità |
|--------|---------------|
| Email per incident | Tutti |
| RSS feed | Tutti |
| SMS | Enterprise |
| Slack webhook | Enterprise |

---

## 4. Incident communication templates

Stati progressivi di un incident sulla status page (allineati a [`incident-response-playbook.md`](incident-response-playbook.md)):

### Investigating
```
Stiamo indagando su un problema che riguarda [component].
Aggiornamento entro [tempo].
```

### Identified
```
Abbiamo identificato la causa del problema su [component]
e stiamo applicando la soluzione.
```

### Monitoring
```
La soluzione è stata applicata. Stiamo monitorando per
confermare il pieno ripristino.
```

### Resolved
```
L'incident è risolto. [Component] è tornato operativo
alle [ora]. Grazie per la pazienza.
```

### Postmortem link
```
Abbiamo pubblicato l'analisi post-incident: [link].
```

---

## 5. Provider raccomandato

**Better Stack** (ex Better Uptime):
- Free tier: fino a 5 monitor, status page pubblica inclusa.
- Supporta i canali email/RSS/Slack richiesti.
- Sufficiente per la fase pre-launch e iniziale.

Alternative valutabili a scala: Instatus, Statuspage (Atlassian).

---

## 6. SLA targets per piano

| Piano | Uptime target | Tipo |
|-------|---------------|------|
| Pro | 99% | Best-effort |
| Avanzato | 99% | Best-effort |
| Enterprise | 99,5% | Contrattuale, con credito su mancato rispetto |

**Onestà**: per i piani Pro e Avanzato l'uptime è un obiettivo best-effort, non una garanzia contrattuale. Solo l'Enterprise prevede un SLA con credito. Non promettere "99,99%" prima di avere la storia operativa che lo sostiene.

---

**Status**: planning document. Da attivare con il setup di status.anlyra.it nel Q3 2026.
