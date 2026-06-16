/**
 * Payment reminder generator — pure logic, no DB, no external calls.
 * Consumed by the future "Scadenzario Incassi" feature.
 */

export type ReminderTone =
  | 'cortese'         // gentle first notice
  | 'neutro'          // neutral follow-up
  | 'fermo'           // firm, clearly overdue
  | 'sollecito_finale'; // final notice before escalation

export type ReminderInput = {
  customerName: string;
  amount: number;
  currency?: string;
  invoiceNumber?: string;
  dueAt: Date;
  tone?: ReminderTone;
};

export type ReminderVariant = {
  tone: ReminderTone;
  subject: string;
  body: string;
  daysOverdue: number;
  suggestedSendAt: Date;
};

export type ReminderSet = {
  input: ReminderInput;
  variants: ReminderVariant[];
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function daysOverdue(dueAt: Date, from: Date): number {
  const ms = from.getTime() - dueAt.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setDate(r.getDate() + n);
  return r;
}

function invoiceRef(inv?: string): string {
  return inv ? ` n. ${inv}` : '';
}

// ── Builders ────────────────────────────────────────────────────────────────

function buildCortese(
  input: ReminderInput,
  overdue: number,
  amountStr: string,
  now: Date,
): ReminderVariant {
  const ref = invoiceRef(input.invoiceNumber);
  const dueLine = overdue > 0
    ? `con scadenza ${formatDate(input.dueAt)}, risulta ad oggi non ancora saldata.`
    : `ha scadenza il ${formatDate(input.dueAt)}.`;
  return {
    tone: 'cortese',
    daysOverdue: overdue,
    suggestedSendAt: overdue <= 0 ? addDays(input.dueAt, -3) : now,
    subject: `Promemoria pagamento — Fattura${ref} — ${amountStr}`,
    body: [
      `Gentile ${input.customerName},`,
      '',
      `Le scriviamo per ricordarLe che la fattura${ref} di ${amountStr} ${dueLine}`,
      '',
      'Qualora avesse già provveduto al pagamento, consideri questo messaggio come non pervenuto.',
      '',
      'Rimaniamo a disposizione per qualsiasi chiarimento.',
      '',
      'Cordiali saluti',
    ].join('\n'),
  };
}

function buildNeutro(
  input: ReminderInput,
  overdue: number,
  amountStr: string,
  now: Date,
): ReminderVariant {
  const ref = invoiceRef(input.invoiceNumber);
  const isPreDue = overdue <= 0;
  return {
    tone: 'neutro',
    daysOverdue: overdue,
    suggestedSendAt: isPreDue ? addDays(input.dueAt, 1) : now,
    subject: isPreDue
      ? `Promemoria scadenza — Fattura${ref} — ${amountStr}`
      : `Sollecito pagamento — Fattura${ref} — ${amountStr}`,
    body: isPreDue
      ? [
          `Gentile ${input.customerName},`,
          '',
          `Le ricordiamo che la fattura${ref} di ${amountStr} ha scadenza il ${formatDate(input.dueAt)}.`,
          '',
          'La preghiamo di voler predisporre il pagamento entro la data indicata,',
          'indicando nella causale il riferimento della fattura.',
          '',
          'Per eventuali domande o per concordare modalità di pagamento, non esiti a contattarci.',
          '',
          'Cordiali saluti',
        ].join('\n')
      : [
          `Gentile ${input.customerName},`,
          '',
          `La fattura${ref} di ${amountStr} con scadenza ${formatDate(input.dueAt)} risulta ad oggi non saldata.`,
          '',
          'La preghiamo di voler procedere al pagamento entro i prossimi 5 giorni lavorativi,',
          'indicando nella causale il riferimento della fattura.',
          '',
          'Per eventuali domande o per concordare modalità alternative, non esiti a contattarci.',
          '',
          'Cordiali saluti',
        ].join('\n'),
  };
}

function buildFermo(
  input: ReminderInput,
  overdue: number,
  amountStr: string,
  now: Date,
): ReminderVariant {
  const ref = invoiceRef(input.invoiceNumber);
  const isPreDue = overdue <= 0;
  const overdueLabel = overdue > 0
    ? `${overdue} ${overdue === 1 ? 'giorno' : 'giorni'}`
    : '';
  return {
    tone: 'fermo',
    daysOverdue: overdue,
    suggestedSendAt: now,
    subject: isPreDue
      ? `Richiesta urgente — Fattura${ref} in scadenza — ${amountStr}`
      : `SOLLECITO — Fattura${ref} scaduta da ${overdueLabel} — ${amountStr}`,
    body: isPreDue
      ? [
          `Gentile ${input.customerName},`,
          '',
          `La contatto in merito alla fattura${ref} di ${amountStr}, in scadenza il ${formatDate(input.dueAt)}.`,
          '',
          'La prego di voler predisporre il pagamento entro la data di scadenza.',
          'In caso di difficoltà, La invito a contattarmi prima della scadenza per concordare una soluzione.',
          '',
          'Distinti saluti',
        ].join('\n')
      : [
          `Gentile ${input.customerName},`,
          '',
          `La fattura${ref} di ${amountStr} con scadenza ${formatDate(input.dueAt)}`,
          `risulta ad oggi non saldata da ${overdueLabel}.`,
          '',
          'La invitiamo a provvedere al saldo ENTRO 7 GIORNI dalla presente.',
          '',
          'Restiamo a disposizione per concordare le modalità di pagamento qualora necessario.',
          '',
          'Distinti saluti',
        ].join('\n'),
  };
}

function buildSollecitoFinale(
  input: ReminderInput,
  overdue: number,
  amountStr: string,
  now: Date,
): ReminderVariant {
  const ref = invoiceRef(input.invoiceNumber);
  const isPreDue = overdue <= 0;
  return {
    tone: 'sollecito_finale',
    daysOverdue: overdue,
    suggestedSendAt: now,
    subject: isPreDue
      ? `URGENTE — Fattura${ref} in scadenza — ${amountStr}`
      : `ULTIMO SOLLECITO — Fattura${ref} — ${amountStr}`,
    body: isPreDue
      ? [
          `Gentile ${input.customerName},`,
          '',
          `Le scriviamo con urgenza in merito alla fattura${ref} di ${amountStr},`,
          `in scadenza il ${formatDate(input.dueAt)}.`,
          '',
          'La preghiamo di saldare o di contattarci entro la data di scadenza',
          'per concordare una soluzione prima che la fattura risulti insoluta.',
          '',
          'Distinti saluti',
        ].join('\n')
      : [
          `Gentile ${input.customerName},`,
          '',
          `Con la presente Le inviamo un ultimo sollecito per la fattura${ref} di ${amountStr},`,
          `scaduta il ${formatDate(input.dueAt)} e ad oggi non saldata.`,
          '',
          'Le chiediamo di procedere al pagamento o di contattarci ENTRO 48 ORE',
          'per concordare una soluzione.',
          '',
          'In assenza di riscontro, saremo tenuti a valutare come procedere.',
          '',
          'Distinti saluti',
        ].join('\n'),
  };
}

const TONE_ORDER: ReminderTone[] = ['cortese', 'neutro', 'fermo', 'sollecito_finale'];

/**
 * Generate one or more reminder variants for an invoice.
 *
 * If `input.tone` is set, returns only that variant.
 * If no tone is set and the invoice is not yet due (daysOverdue <= 0), returns
 * only the 'cortese' variant — a pre-due reminder should not escalate automatically.
 * Otherwise returns all four tones ordered by escalation.
 *
 * `now` defaults to the current date; exposed as a parameter for deterministic tests.
 */
export function generateReminders(input: ReminderInput, now: Date = new Date()): ReminderSet {
  if (!input.customerName?.trim()) throw new Error('customerName è obbligatorio');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('amount deve essere un numero positivo');
  if (!(input.dueAt instanceof Date) || Number.isNaN(input.dueAt.getTime())) throw new Error('dueAt non è una data valida');

  const currency = input.currency?.toUpperCase() ?? 'EUR';
  const amountStr = formatCurrency(input.amount, currency);
  const overdue = daysOverdue(input.dueAt, now);

  const builders: Record<ReminderTone, () => ReminderVariant> = {
    cortese:          () => buildCortese(input, overdue, amountStr, now),
    neutro:           () => buildNeutro(input, overdue, amountStr, now),
    fermo:            () => buildFermo(input, overdue, amountStr, now),
    sollecito_finale: () => buildSollecitoFinale(input, overdue, amountStr, now),
  };

  let tones: ReminderTone[];
  if (input.tone) {
    tones = [input.tone];
  } else if (overdue <= 0) {
    // Pre-due: only send a gentle reminder, never auto-escalate
    tones = ['cortese'];
  } else {
    tones = TONE_ORDER;
  }

  return {
    input,
    variants: tones.map((t) => builders[t]()),
  };
}

/**
 * Suggest which tone to use based on how many days overdue the invoice is.
 * Useful for automated scheduling logic.
 */
export function suggestTone(dueAt: Date, now: Date = new Date()): ReminderTone {
  const overdue = daysOverdue(dueAt, now);
  if (overdue < 0) return 'cortese';
  if (overdue <= 7) return 'neutro';
  if (overdue <= 30) return 'fermo';
  return 'sollecito_finale';
}
