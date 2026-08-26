/**
 * Verifica che i dati aziendali nei file di traduzione siano ancora allineati
 * con la costante unica `src/lib/company.ts`.
 *
 * PERCHÉ ESISTE: i file `src/messages/it.json` / `en.json` non possono importare
 * una costante TypeScript, e 26 delle 38 occorrenze dell'indirizzo di contatto
 * vivono lì — dentro il testo legale in prosa. Non sono state trasformate in
 * segnaposto ICU di proposito (vedi il commento in cima a `src/lib/company.ts`
 * per il ragionamento completo). Questo controllo è la rete di sicurezza per
 * quella metà: se qualcuno cambia l'indirizzo nella costante e si dimentica i
 * file di traduzione (o viceversa), qui salta fuori invece di finire online.
 *
 * COSA CONTROLLA:
 *  1. le chiavi STRUTTURATE che il footer legge già oggi
 *     (`landing.footer.contactEmail`, `.companyLegalName`, `.companyAddress`,
 *     `.companyVat`) devono combaciare esattamente con la costante;
 *  2. nessun file di traduzione deve contenere un indirizzo `@anlyra.com`
 *     DIVERSO da quelli dichiarati nella costante (intercetta il caso "ne è
 *     rimasto uno vecchio in mezzo alla prosa").
 *
 * SOLA LETTURA: non tocca il database e non modifica nessun file.
 *
 * USO:
 *   npm run check:company
 *
 * Esce 0 se tutto è allineato, 1 se trova una divergenza — utilizzabile come
 * gate in una CI futura.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMPANY } from '../src/lib/company';

type Messages = Record<string, unknown>;

const LOCALES = ['it', 'en'] as const;

/** Legge un valore annidato tipo "legal.contactEmail". */
function getPath(obj: Messages, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Messages)[key] : undefined), obj);
}

/** Chiavi i18n strutturate che devono combaciare con la costante. */
const STRUCTURED: { key: string; expected: string; label: string }[] = [
  { key: 'landing.footer.contactEmail', expected: COMPANY.contactEmail, label: 'email di contatto' },
  { key: 'landing.footer.companyLegalName', expected: COMPANY.legalName, label: 'ragione sociale' },
  { key: 'landing.footer.companyAddress', expected: COMPANY.address, label: 'indirizzo' },
];

const problems: string[] = [];

for (const locale of LOCALES) {
  const path = join(process.cwd(), 'src', 'messages', `${locale}.json`);
  const raw = readFileSync(path, 'utf8');
  const messages = JSON.parse(raw) as Messages;

  // 1. chiavi strutturate
  for (const { key, expected, label } of STRUCTURED) {
    const actual = getPath(messages, key);
    if (typeof actual !== 'string') {
      problems.push(`${locale}.json — chiave "${key}" mancante o non è una stringa (${label}).`);
    } else if (actual !== expected) {
      problems.push(
        `${locale}.json — "${key}" (${label}) non combacia:\n` +
          `    nel file:      ${actual}\n` +
          `    nella costante: ${expected}`,
      );
    }
  }

  // La P.IVA nella chiave strutturata è formattata ("P.IVA 04275010363 · Regime
  // Forfetario"), quindi si controlla che CONTENGA il numero, non che sia uguale.
  const vatValue = getPath(messages, 'landing.footer.companyVat');
  if (typeof vatValue !== 'string' || !vatValue.includes(COMPANY.vat)) {
    problems.push(
      `${locale}.json — "landing.footer.companyVat" non contiene la P.IVA ${COMPANY.vat} ` +
        `(valore: ${String(vatValue)}).`,
    );
  }

  // 2. nessun indirizzo @anlyra.com diverso da quelli dichiarati
  const known = new Set<string>([COMPANY.contactEmail, COMPANY.noreplyEmail]);
  const found = raw.match(/[a-zA-Z0-9._%+-]+@anlyra\.com/g) ?? [];
  for (const address of new Set(found)) {
    if (!known.has(address)) {
      problems.push(
        `${locale}.json — trovato l'indirizzo "${address}", che non è fra quelli dichiarati in ` +
          `src/lib/company.ts (${[...known].join(', ')}). Indirizzo vecchio rimasto nella prosa?`,
      );
    }
  }

  // 3. la PEC, che compare solo nella prosa legale
  if (!raw.includes(COMPANY.pec)) {
    problems.push(`${locale}.json — non contiene la PEC ${COMPANY.pec} dichiarata nella costante.`);
  }
}

if (problems.length === 0) {
  console.log(
    'OK — i dati aziendali nei file di traduzione sono allineati con src/lib/company.ts.',
  );
} else {
  console.error(`ATTENZIONE — ${problems.length} divergenza/e fra i file di traduzione e src/lib/company.ts:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    '\nI file di traduzione non possono importare la costante: vanno aggiornati a mano.\n' +
      'Cerca il valore vecchio in src/messages/it.json e en.json e sostituiscilo.',
  );
  process.exitCode = 1;
}
