---
title: Anlyra · Investor FAQ
audience: founder (Q&A con investitori)
status: living document · internal
last_updated: 2026-05-27
---

# Investor FAQ

> 30 domande/risposte per la conversazione con investitori. Risposte fattuali, brevi, senza fluff.
> Dove i numeri non sono ancora disponibili, sono marcati come **[placeholder]** — coerente con il
> valore brand "Onestà radicale" ([`brand-guidelines.md`](brand-guidelines.md)).

**Documenti correlati**: [`competitor-analysis.md`](competitor-analysis.md),
[`pricing-strategy-analysis.md`](pricing-strategy-analysis.md),
[`financial/financial-model-outline.md`](financial/financial-model-outline.md),
[`roadmap.md`](roadmap.md), [`hiring/plan-and-jd.md`](hiring/plan-and-jd.md).

---

## 1. Mercato e opportunità

**Q: Qual è il TAM/SAM/SOM?**
A: TAM: PMI europee con bisogno analytics (~milioni di aziende). SAM: PMI italiane 5-50 dipendenti
(~[placeholder]). SOM realistico a 3 anni: [placeholder] clienti paganti.

**Q: Perché ora?**
A: L'AI generativa ha reso economicamente fattibile dare insight automatici a basso costo, cosa
impossibile 3 anni fa. Le PMI italiane sono sotto-servite dai tool BI enterprise.

**Q: Chi è il cliente target?**
A: PMI italiane 5-50 dipendenti che oggi decidono "a sensazione" o con Excel caotici, attente alla
privacy e diffidenti verso i tool US tradotti.

---

## 2. Prodotto e tecnologia

**Q: Qual è il vostro moat tecnologico?**
A: Non l'AI in sé (commodity), ma il layer di grounding/validazione che rende gli insight affidabili
sui dati reali italiani, più la specializzazione di dominio PMI italiana.

**Q: Cosa vi rende difendibili?**
A: Dati proprietari di utilizzo, fiducia sul tema privacy, focus verticale italiano, e switching cost
crescente man mano che il cliente costruisce le sue dashboard e storico.

**Q: Qual è la roadmap?**
A: Vedi [`roadmap.md`](roadmap.md). In sintesi: consolidamento auth/multi-org (fatto), forecast AI,
integrazioni gestionali/bancarie, espansione KPI operativi.

---

## 3. Business model

**Q: Come fate soldi?**
A: SaaS ricorrente, 3 piani (Pro/Avanzato/Enterprise) + credit pack one-time. Subscription per
organizzazione. Dettaglio in [`pricing-strategy-analysis.md`](pricing-strategy-analysis.md).

**Q: Qual è l'unit economics?**
A: Gross margin stimato 78-87% a seconda dello scenario; LTV/CAC target 6-11×. Da validare in
produzione (costo per-insight Anthropic è la variabile chiave).

**Q: Come gestite la retention?**
A: Onboarding drip (vedi [`email/onboarding-sequence.md`](email/onboarding-sequence.md)), valore
crescente con lo storico dati, alert proattivi. Target churn < 4%/mese.

---

## 4. Traction

**Q: Quanti signup avete?**
A: [placeholder] — in fase pre-beta/beta.

**Q: Qual è l'MRR attuale?**
A: [placeholder] — pricing in finalizzazione post customer interviews.

**Q: Churn e NPS?**
A: [placeholder] — strumentazione attiva, dati significativi attesi post-beta.

---

## 5. Team

**Q: Chi sono i founder?**
A: [placeholder profili founder] — competenze prodotto/tech + dominio PMI italiana.

**Q: Avete advisor?**
A: [placeholder] — in costruzione, focus su SaaS B2B e GTM italiano.

**Q: Qual è il piano di hiring?**
A: 5 assunzioni 2026-2027 (engineer, CS, growth, sales, designer). Dettaglio in
[`hiring/plan-and-jd.md`](hiring/plan-and-jd.md).

---

## 6. Competition

**Q: Chi sono i competitor?**
A: QuickBooks/Xero (accounting), Klipfolio/Pulse (dashboard), Visible (investor reporting). Vedi
[`competitor-analysis.md`](competitor-analysis.md). Nessuno copre "AI advisor operativo per PMI italiana".

**Q: Come vi posizionate?**
A: A metà fascia: più intelligente di una dashboard, più semplice ed economico di un BI enterprise,
nativamente italiano e privacy-first.

**Q: Qual è il vostro win rate vs alternative?**
A: [placeholder] — tracking win/loss attivo (vedi [`sales/playbook.md`](sales/playbook.md)).

---

## 7. Fundraising

**Q: Quanto state raccogliendo?**
A: [placeholder] round size.

**Q: A quale valutazione?**
A: [placeholder] — coerente con stage e benchmark di mercato.

**Q: Come userete i fondi?**
A: Principalmente prodotto (engineering), GTM (sales/marketing) e runway per raggiungere le milestone
di traction.

**Q: Quali milestone con questo round?**
A: [placeholder] — es. X clienti paganti, €Y MRR, churn < Z%, in N mesi.

---

## 8. Risks

**Q: E se Anthropic alza i prezzi o cambia policy?**
A: Architettura provider-aware: i prompt e il parsing sono isolati, migrabili ad altri modelli se
necessario. Il costo AI è monitorato con alert di budget.

**Q: E la dipendenza da un singolo fornitore AI?**
A: Mitigata dall'astrazione del layer AI (vedi [`ai/prompt-library.md`](ai/prompt-library.md)) e dalla
possibilità di multi-modello.

**Q: Rischio regolatorio (GDPR/AI Act)?**
A: Privacy by design, DPA con tutti i sub-processor, no training su dati cliente. Vedi
[`security-audit-checklist.md`](security-audit-checklist.md) e [`gdpr/`](gdpr/).

---

## 9. Exit strategy

**Q: Quali sono i candidati all'acquisizione?**
A: Player accounting/ERP italiani ed europei, software house B2B, piattaforme fintech PMI.

**Q: Considerate un percorso IPO?**
A: Non nel breve. Focus su crescita sostenibile e ottica di acquisizione strategica a medio termine.

---

## 10. Customer references

**Q: Avete reference clienti?**
A: [placeholder] — in raccolta durante la beta. Formato: nome azienda, settore, problema risolto,
risultato quantificato, citazione.

---

**Status**: living document · internal.  
**Last updated**: 2026-05-27.  
**Nota**: aggiornare i **[placeholder]** con dati reali prima di ogni meeting investor.
