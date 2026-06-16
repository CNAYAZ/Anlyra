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

function buildCortese(
  input: ReminderInput,
  overdue: number,
  currency: string,
  amountStr: string,
  now: Date,
): ReminderVariant {
  const ref = invoiceRef(input.invoiceNumber);
  return {
    tone: 'cortese',
    daysOverdue: overdue,
    suggestedSendAt: overdue <= 0 ? addDays(input.dueAt, -3) : now,
    subject: `Promemoria pagamento — Fattura${ref} — ${amountStr}`,
    body: [
      `Gentile ${input.customerName},`,
      '',
      `Le scriviamo per ricordarLe che la fattura${ref} di ${amountStr} risulta`,
      overdue > 0
        ? `in scadenza il ${formatDate(input.dueAt)} (${overdue} ${overdue === 1 ? 'giorno' : 'giorni'} fa).`
        : `in scadenza il ${formatDate(input.dueAt)}.`,
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
  currency: string,
  amountStr: string,
  now: Date,
): ReminderVariant {
  const ref = invoiceRef(input.invoiceNumber);
  return {
    tone: 'neutro',
    daysOverdue: overdue,
    suggestedSendAt: overdue <= 0 ? addDays(input.dueAt, 1) : now,
    subject: `Sollecito pagamento — Fattura${ref} scaduta`,
    body: [
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
  currency: string,
  amountStr: string,
  now: Date,
): ReminderVariant {
  const ref = invoiceRef(input.invoiceNumber);
  const overdueLabel = overdue > 0
    ? `${overdue} ${overdue === 1 ? 'giorno' : 'giorni'}`
    : 'alcuni giorni';
  return {
    tone: 'fermo',
    daysOverdue: overdue,
    suggestedSendAt: now,
    subject: `SOLLECITO — Fattura${ref} scaduta da ${overdue > 0 ? `${overdue} giorni` : 'alcuni giorni'} — ${amountStr}`,
    body: [
      `Gentile ${input.customerName},`,
      '',
      `Nonostante i precedenti solleciti, la fattura${ref} di ${amountStr},`,
      `con scadenza ${formatDate(input.dueAt)}, risulta ancora insoluta da ${overdueLabel}.`,
      '',
      'Le chiediamo di provvedere al saldo ENTRO 7 GIORNI dalla presente.',
      '',
      'In assenza di riscontro saremo costretti a valutare le azioni necessarie',
      'per il recupero del credito.',
      '',
      'Distinti saluti',
    ].join('\n'),
  };
}

function buildSollecitoFinale(
  input: ReminderInput,
  overdue: number,
  currency: string,
  amountStr: string,
  now: Date,
): ReminderVariant {
  const ref = invoiceRef(input.invoiceNumber);
  const overdueLabel = overdue > 0 ? `${overdue} giorni fa` : 'di recente';
  return {
    tone: 'sollecito_finale',
    daysOverdue: overdue,
    suggestedSendAt: now,
    subject: `ULTIMO SOLLECITO — Fattura${ref} — Azione imminente`,
    body: [
      `Gentile ${input.customerName},`,
      '',
      `Con la presente Le notifichiamo che la fattura${ref} di ${amountStr},`,
      `scaduta il ${formatDate(input.dueAt)} (${overdueLabel}), rimane ad oggi non pagata.`,
      '',
      'ULTIMO AVVISO: qualora non ricevessimo il pagamento o una comunicazione scritta',
      'entro 48 ore, procederemo al recupero del credito tramite le vie legali previste.',
      '',
      'Per evitare ulteriori costi e inconvenienti, La invitiamo a contattarci',
      'immediatamente per concordare il saldo.',
      '',
      'Senza riserve di sorta,',
    ].join('\n'),
  };
}

const TONE_ORDER: ReminderTone[] = ['cortese', 'neutro', 'fermo', 'sollecito_finale'];

/**
 * Generate one or more reminder variants for an invoice.
 *
 * If `input.tone` is set, returns only that variant.
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
    cortese:          () => buildCortese(input, overdue, currency, amountStr, now),
    neutro:           () => buildNeutro(input, overdue, currency, amountStr, now),
    fermo:            () => buildFermo(input, overdue, currency, amountStr, now),
    sollecito_finale: () => buildSollecitoFinale(input, overdue, currency, amountStr, now),
  };

  const tones: ReminderTone[] = input.tone ? [input.tone] : TONE_ORDER;
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
