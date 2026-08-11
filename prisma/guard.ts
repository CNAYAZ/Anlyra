/**
 * GUARDIA — blocca gli script distruttivi contro il database di PRODUZIONE.
 *
 * PERCHÉ ESISTE
 * Anlyra ha UN SOLO database Supabase: lo stesso che serve il sito online
 * (anlyra.com) e su cui ci sono già utenti registrati veri. Gli script di seed
 * in questa cartella eseguono `deleteMany` su più tabelle: lanciarli per
 * sbaglio con la DATABASE_URL di produzione cancellerebbe dati di clienti.
 * Questa guardia si mette in mezzo e ferma il comando prima che tocchi il DB.
 *
 * PERCHÉ STA IN `prisma/` E NON IN `src/lib/`
 * 1. Protegge script da riga di comando (ops), non l'applicazione. Tutto quello
 *    che sta in `src/lib/` può finire, per un import distratto, nel grafo dei
 *    moduli di Next: questo file chiama `process.exit()` e `readFileSync`, cose
 *    che NON devono mai poter girare dentro una route o nel bundle client.
 * 2. Sta accanto ai file che protegge (i quattro `seed*.ts` di questa cartella).
 * 3. `prisma/` è già la cartella del codice "solo strumenti", non di prodotto.
 *
 * COME SI USA
 *   // dentro uno script TypeScript, PRIMA di creare il PrismaClient:
 *   import { assertNotProductionDatabase } from './guard';
 *   assertNotProductionDatabase('npm run db:seed');
 *
 *   # davanti a un comando della CLI Prisma, dentro package.json:
 *   tsx prisma/guard.ts "prisma migrate dev" && prisma migrate dev
 *
 * NON è applicata a `prisma migrate deploy` (applicare le migrazioni alla
 * produzione è legittimo e necessario a ogni deploy) né al codice
 * dell'applicazione: solo agli script distruttivi lanciati a mano.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAZIONE — l'unico punto da modificare quando i database cambiano.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Identificativi dei database DI PRODUZIONE, da proteggere sempre.
 *
 * Per Supabase è il "project ref": la stringa di 20 lettere che compare sia
 * nell'utente del pooler (`postgres.ikthodgtxflhiykgpcnr`) sia nell'host della
 * connessione diretta (`db.ikthodgtxflhiykgpcnr.supabase.co`). Cercarlo come
 * sottostringa dell'intera URL lo intercetta in entrambe le forme, qualunque
 * sia l'host o la porta.
 *
 * Oggi c'è un solo progetto Supabase, usato sia in sviluppo sia dal sito
 * online: questo è quello. Quando nascerà un progetto separato per la
 * produzione, il ref NUOVO va aggiunto qui e quello vecchio (diventato di
 * sviluppo) va spostato in NON_PRODUCTION_DATABASE_IDS.
 */
const PRODUCTION_DATABASE_IDS: readonly string[] = ['ikthodgtxflhiykgpcnr'];

/**
 * Host che sono con certezza NON di produzione: un Postgres che gira sulla
 * macchina di sviluppo o nel container di fianco. Confrontati sull'host esatto
 * della URL, non come sottostringa, per non lasciar passare per errore un host
 * remoto che li contenga nel nome.
 */
const NON_PRODUCTION_HOSTS: readonly string[] = [
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  'host.docker.internal',
  'db', // nome servizio tipico in docker-compose
  'postgres', // idem
];

/**
 * Identificativi di database REMOTI noti e non di produzione (un eventuale
 * progetto Supabase di staging o di sviluppo). Oggi vuoto: non esiste ancora un
 * secondo progetto. Finché è vuoto, QUALSIASI database remoto non riconosciuto
 * viene bloccato — è la scelta fail-closed descritta sotto.
 */
const NON_PRODUCTION_DATABASE_IDS: readonly string[] = [];

/** Sblocco esplicito: variabile d'ambiente e valore esatto richiesto. */
const UNLOCK_VAR = 'ALLOW_PROD_DB_WRITE';
const UNLOCK_VALUE = 'yes';

/**
 * File di ambiente da ispezionare, oltre alle variabili già esportate nella
 * shell. Sono controllati TUTTI perché ogni punto d'ingresso ne legge uno
 * diverso (verificato il 2026-08-11 su questo repo):
 *   - `tsx prisma/seed.ts`  → NON legge nessun file, solo la shell;
 *   - `npx prisma <cmd>`    → la CLI Prisma legge `.env` (non `.env.local`);
 *   - Next.js in sviluppo   → legge `.env.local` con priorità su `.env`.
 * Dato che la precedenza cambia da comando a comando, la guardia non prova a
 * indovinare quale URL vincerà: se ANCHE UNO SOLO di questi valori punta alla
 * produzione, blocca.
 */
const ENV_FILES: readonly string[] = ['.env.local', '.env', join('prisma', '.env')];

/** Variabili che contengono una destinazione di database. */
const URL_VARS: readonly string[] = ['DATABASE_URL', 'DIRECT_URL'];

// ─────────────────────────────────────────────────────────────────────────────
// Lettura delle candidate
// ─────────────────────────────────────────────────────────────────────────────

type Candidate = { origin: string; variable: string; url: string };

/**
 * Parser minimo di un file `.env`: solo `CHIAVE=valore`, con o senza apici, i
 * commenti e le righe vuote ignorati. Scritto a mano invece di usare `dotenv`
 * per non aggiungere una dipendenza a un file di sicurezza, e per non toccare
 * `process.env` (la guardia deve solo LEGGERE, non cambiare l'ambiente del
 * comando che sta per partire).
 */
function readEnvFile(path: string): Record<string, string> {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return {}; // file assente: normale, non è un errore
  }
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    if (value) out[key] = value;
  }
  return out;
}

/** Tutte le destinazioni di database visibili da questa cartella. */
function collectCandidates(cwd: string): Candidate[] {
  const found: Candidate[] = [];
  const seen = new Set<string>();

  const add = (origin: string, variable: string, url: string | undefined) => {
    if (!url) return;
    const key = `${variable} ${url}`;
    if (seen.has(key)) return; // stesso valore da più sorgenti: una volta basta
    seen.add(key);
    found.push({ origin, variable, url });
  };

  for (const v of URL_VARS) add('ambiente della shell', v, process.env[v]);
  for (const file of ENV_FILES) {
    const values = readEnvFile(join(cwd, file));
    for (const v of URL_VARS) add(file, v, values[v]);
  }
  return found;
}

// ─────────────────────────────────────────────────────────────────────────────
// Classificazione
// ─────────────────────────────────────────────────────────────────────────────

type Verdict = 'production' | 'safe' | 'unknown';

/** L'host della URL, in minuscolo e senza parentesi quadre dell'IPv6. */
function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  } catch {
    return undefined; // URL illeggibile → chi chiama la tratta come 'unknown'
  }
}

/**
 * FAIL-CLOSED: si esce da qui con 'safe' solo quando la destinazione è
 * riconosciuta con certezza come non di produzione. Tutto il resto — un host
 * remoto mai visto, una URL che non si riesce nemmeno a leggere — è 'unknown',
 * e 'unknown' blocca. Un blocco di troppo costa un minuto; una cancellazione
 * costa i dati dei clienti.
 */
function classify(url: string): Verdict {
  const lower = url.toLowerCase();
  if (PRODUCTION_DATABASE_IDS.some((id) => lower.includes(id.toLowerCase()))) return 'production';
  if (NON_PRODUCTION_DATABASE_IDS.some((id) => lower.includes(id.toLowerCase()))) return 'safe';
  const host = hostOf(url);
  if (!host) return 'unknown';
  if (NON_PRODUCTION_HOSTS.includes(host)) return 'safe';
  return 'unknown';
}

/**
 * Versione stampabile della URL SENZA la password: questi messaggi finiscono
 * nel terminale e nei log, e la password del database non deve comparirci.
 */
function redact(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    // Non si riesce a leggerla: non stampare nulla del contenuto, potrebbe
    // essere una URL malformata che contiene comunque la password.
    return '(URL non interpretabile)';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Messaggi
// ─────────────────────────────────────────────────────────────────────────────

const LINE = '═'.repeat(74);

function blockAndExit(command: string, reason: string, details: string[]): never {
  const msg = [
    '',
    LINE,
    '  COMANDO ANNULLATO — QUESTO È IL DATABASE DI PRODUZIONE',
    LINE,
    '',
    `  Comando bloccato: ${command}`,
    `  Motivo:           ${reason}`,
    '',
    ...details.map((d) => `  ${d}`),
    '',
    '  Non è stata eseguita NESSUNA operazione: il database non è stato',
    '  toccato. Il comando si è fermato prima di collegarsi.',
    '',
    '  Questo database è lo stesso che serve il sito online (anlyra.com) e',
    '  contiene i dati di utenti reali. Gli script di seed cancellano tabelle',
    '  intere: eseguirli qui vorrebbe dire perdere quei dati.',
    '',
    '  ── SE VUOI DAVVERO PROCEDERE ─────────────────────────────────────────',
    '',
    '  Fai prima un backup dal pannello Supabase (Database → Backups).',
    '  Poi ripeti il comando aggiungendo lo sblocco esplicito SULLA STESSA',
    '  RIGA, così vale solo per quel comando e non resta attivo dopo:',
    '',
    `      ${UNLOCK_VAR}=${UNLOCK_VALUE} ${command}`,
    '',
    `  Non esportare ${UNLOCK_VAR} nella shell e non metterlo in un file`,
    '  .env o nelle variabili di Vercel: se resta attivo, questa protezione',
    '  non serve più a niente.',
    '',
    LINE,
    '',
  ].join('\n');
  console.error(msg);
  process.exit(1);
}

function warnUnlocked(command: string, reason: string): void {
  console.warn(
    [
      '',
      LINE,
      '  ⚠  SBLOCCO ATTIVO — STAI SCRIVENDO SUL DATABASE DI PRODUZIONE  ⚠',
      LINE,
      '',
      `  Comando:  ${command}`,
      `  La guardia avrebbe bloccato: ${reason}`,
      `  Proseguo perché ${UNLOCK_VAR}=${UNLOCK_VALUE} è impostata.`,
      '',
      '  Se non l\'hai messa tu adesso, di proposito, per QUESTO comando:',
      `  interrompi con Ctrl+C e togli ${UNLOCK_VAR} dall'ambiente.`,
      '',
      LINE,
      '',
    ].join('\n'),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Blocca l'esecuzione (uscita con codice 1) se la destinazione del database non
 * è riconosciuta con certezza come NON di produzione.
 *
 * Va chiamata il più presto possibile, PRIMA di costruire il PrismaClient e
 * prima di qualsiasi scrittura.
 *
 * @param command  Il comando così come lo lancia una persona (es.
 *                 `npm run db:seed`), usato nei messaggi e nel suggerimento di
 *                 sblocco.
 */
export function assertNotProductionDatabase(command: string): void {
  const cwd = process.cwd();
  const candidates = collectCandidates(cwd);
  const unlocked = process.env[UNLOCK_VAR] === UNLOCK_VALUE;

  // Nessuna destinazione leggibile: non si può escludere la produzione.
  if (candidates.length === 0) {
    const reason = `non trovo ${URL_VARS.join(' né ')} — non posso escludere che sia la produzione`;
    if (unlocked) {
      warnUnlocked(command, reason);
      return;
    }
    blockAndExit(command, reason, [
      'Cercata nell\'ambiente della shell e in: ' + ENV_FILES.join(', '),
      'In questa cartella non c\'è nessun file di ambiente (i file .env non',
      'vengono versionati e non viaggiano tra un ambiente e l\'altro).',
    ]);
  }

  const graded = candidates.map((c) => ({ ...c, verdict: classify(c.url) }));
  const production = graded.filter((c) => c.verdict === 'production');
  const unknown = graded.filter((c) => c.verdict === 'unknown');

  if (production.length > 0) {
    const reason = 'la destinazione è un database elencato come DI PRODUZIONE';
    if (unlocked) {
      warnUnlocked(command, reason);
      return;
    }
    blockAndExit(command, reason, [
      'Destinazioni di produzione trovate:',
      ...production.map((c) => `  · ${c.variable} (da ${c.origin}) → ${redact(c.url)}`),
    ]);
  }

  if (unknown.length > 0) {
    const reason = 'database remoto non riconosciuto — per prudenza vale come produzione';
    if (unlocked) {
      warnUnlocked(command, reason);
      return;
    }
    blockAndExit(command, reason, [
      'Destinazioni non riconosciute:',
      ...unknown.map((c) => `  · ${c.variable} (da ${c.origin}) → ${redact(c.url)}`),
      '',
      'La guardia consente solo destinazioni che sa essere di sviluppo (host',
      `locale, oppure un progetto elencato in NON_PRODUCTION_DATABASE_IDS in`,
      'prisma/guard.ts). Se questo database è davvero di sviluppo, aggiungi il',
      'suo identificativo a quell\'elenco: da quel momento non chiederà più.',
    ]);
  }

  const where = graded.map((c) => `${c.variable}=${hostOf(c.url) ?? '?'}`).join(', ');
  console.log(`[guard] Database di sviluppo (${where}) — procedo con: ${command}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Uso da riga di comando
// ─────────────────────────────────────────────────────────────────────────────
//
//   tsx prisma/guard.ts "prisma migrate dev" && prisma migrate dev
//
// Il controllo su `process.argv[1]` fa sì che l'importazione da un altro script
// NON esegua niente: quando `seed.ts` importa questo file, argv[1] è
// `prisma/seed.ts`, non `prisma/guard.ts`. Si usa argv invece di
// `import.meta.url` perché questo file viene eseguito sia come CommonJS sia
// come ESM a seconda del comando, e `import.meta` non è disponibile in CJS.
const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (/(^|\/)guard\.(ts|js|mts|cts|mjs|cjs)$/.test(entry)) {
  assertNotProductionDatabase(process.argv[2] ?? 'comando sul database');
}
