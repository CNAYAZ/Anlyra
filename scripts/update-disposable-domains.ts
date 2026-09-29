/**
 * Aggiorna l'elenco dei domini di email temporanee usato all'iscrizione
 * (`src/lib/auth/disposable-email-domains.json`, letto da
 * `src/lib/auth/disposable-email.ts`).
 *
 * FONTE: github.com/disposable-email-domains/disposable-email-domains, file
 * `disposable_email_blocklist.conf` (pubblico dominio, CC0).
 *
 * USO:
 *   npm run update:disposable-domains
 * poi controllare il riepilogo stampato, e fare commit del file JSON cambiato.
 *
 * Non tocca il database. Non scrive nulla se la fonte risponde con un errore o
 * con un elenco sospettosamente corto (meno di 1000 domini). I falsi positivi
 * NON si correggono qui: vanno in DISPOSABLE_EMAIL_EXCEPTIONS.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE =
  'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf';
const TARGET = join(process.cwd(), 'src/lib/auth/disposable-email-domains.json');

async function main() {
  const res = await fetch(SOURCE);
  if (!res.ok) {
    console.error(`Fonte non raggiungibile (HTTP ${res.status}): nessun file modificato.`);
    process.exit(1);
  }
  const next = [
    ...new Set(
      (await res.text())
        .split('\n')
        .map((l) => l.trim().toLowerCase())
        .filter((l) => l && !l.startsWith('#')),
    ),
  ].sort();
  if (next.length < 1000) {
    console.error(`Elenco sospetto: solo ${next.length} domini. Nessun file modificato.`);
    process.exit(1);
  }

  const prev = new Set<string>(JSON.parse(readFileSync(TARGET, 'utf8')));
  const added = next.filter((d) => !prev.has(d));
  const nextSet = new Set(next);
  const removed = [...prev].filter((d) => !nextSet.has(d));

  writeFileSync(TARGET, `[\n${next.map((d) => JSON.stringify(d)).join(',\n')}\n]\n`);
  console.log(`Domini: ${prev.size} prima, ${next.length} ora (+${added.length}, -${removed.length}).`);
  if (removed.length) console.log(`Tolti: ${removed.slice(0, 20).join(', ')}${removed.length > 20 ? ', …' : ''}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
