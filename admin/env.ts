import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Minimal .env loader for the admin panel.
 *
 * WHY THIS EXISTS: the panel runs as a plain `tsx` process, not through Next.
 * Next auto-loads `.env` / `.env.local`; a bare Node process does NOT, so
 * without this DATABASE_URL and CRON_SECRET would simply be undefined and the
 * panel would fail with a confusing Prisma error instead of a clear message.
 *
 * Hand-written rather than adding `dotenv`: the parser is ~20 lines and the
 * project deliberately avoids new dependencies for tooling (same reasoning as
 * prisma/guard.ts, which has its own copy for the same reason — that one is a
 * safety file that must not import anything, so it is not shared).
 *
 * Precedence matches Next's: `.env.local` wins over `.env`, and a variable
 * already present in the real environment wins over both (so
 * `DATABASE_URL=... npm run admin` behaves as expected).
 */

function parseEnvFile(path: string): Record<string, string> {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return {}; // missing file is normal, not an error
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

/** Loads .env then .env.local into process.env WITHOUT overwriting existing values. */
export function loadEnvFiles(cwd = process.cwd()): void {
  const merged = {
    ...parseEnvFile(join(cwd, '.env')),
    ...parseEnvFile(join(cwd, '.env.local')), // .env.local wins
  };
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
