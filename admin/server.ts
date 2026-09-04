import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { loadEnvFiles } from './env';

// Environment BEFORE anything else: guards read process.env, and importing the
// Prisma client early would capture a missing DATABASE_URL.
loadEnvFiles();

import {
  assertSafeToStart,
  isCronSecretConfigured,
  isCodespace,
  expectedCodespaceHost,
  codespaceUrl,
  AdminStartupError,
} from './guards';
import { renderPage } from './ui';
import {
  listOrganizations,
  listUsers,
  listAuditLog,
  listAuditActions,
  getCounts,
  countInsightsMatching,
} from './queries';
import {
  setCredits,
  setPlan,
  setMemberRole,
  deleteInsights,
  deleteRowById,
  unblockAccount,
  runCron,
  VALID_PLANS,
  VALID_ROLES,
  DELETABLE_TABLES,
  type ValidPlan,
  type ValidRole,
  type DeletableTable,
  type CronJob,
  CRON_JOBS,
} from './actions';

/**
 * Local-only admin panel for the founder.
 *
 * BIND ADDRESS: 127.0.0.1 everywhere EXCEPT inside a GitHub Codespace, where it
 * is 0.0.0.0 — see guards.ts's "CODESPACE PORT FORWARDING" note for why
 * loopback-only breaks the browser there (the forwarding proxy reaches the
 * container over its own interface, not loopback) and why widening the bind
 * is still safe (the forwarded port is private to the Codespace owner, and the
 * Host-header check below narrows what 0.0.0.0 will actually answer to).
 *
 * See guards.ts for the startup preconditions and the note on why
 * prisma/guard.ts is deliberately not reused here.
 */

const PORT = Number(process.env.ADMIN_PORT ?? 3001);
const BIND_HOST = isCodespace() ? '0.0.0.0' : '127.0.0.1';

/**
 * Per-start random token. The page embeds it; every mutating request must send
 * it back in x-admin-token.
 *
 * WHY: without it, any website open in the same browser could POST to
 * http://127.0.0.1:3001/api/... and silently change production data (classic
 * CSRF against a local tool). A cross-origin page cannot read this page, so it
 * cannot learn the token; and setting a custom header forces a preflight that
 * this server never approves.
 */
const CSRF_TOKEN = randomBytes(32).toString('hex');

type Json = Record<string, unknown> | unknown[] | null;

function sendJson(res: ServerResponse, status: number, payload: Json) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const ok = (res: ServerResponse, data: unknown) => sendJson(res, 200, { ok: true, data });
const err = (res: ServerResponse, status: number, message: string) =>
  sendJson(res, status, { ok: false, error: message });

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    // Nothing this panel accepts is large; a cap keeps a stray huge POST from
    // filling memory.
    if (size > 1_000_000) throw new Error('Corpo della richiesta troppo grande.');
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

/**
 * Rejects requests whose Host is neither localhost nor (inside a Codespace)
 * the exact hostname GitHub's port-forwarding proxy sends. Blocks
 * DNS-rebinding attempts the same way the original localhost-only check did;
 * widened, not disabled, now that the bind address is 0.0.0.0 in a Codespace
 * and can no longer do that job on its own.
 *
 * Deliberately an exact match against expectedCodespaceHost(PORT) — never a
 * suffix check against the forwarding domain, which would also accept every
 * OTHER forwarded port and every other Codespace's forwarded hosts on the
 * same domain.
 */
function hostIsAllowed(req: IncomingMessage): boolean {
  const host = (req.headers.host ?? '').split(':')[0];
  if (host === '127.0.0.1' || host === 'localhost' || host === '[::1]' || host === '::1') {
    return true;
  }
  return isCodespace() && host === expectedCodespaceHost(PORT);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

async function handleGet(pathname: string, search: URLSearchParams, res: ServerResponse) {
  switch (pathname) {
    case '/':
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(renderPage({ csrfToken: CSRF_TOKEN, cronAvailable: isCronSecretConfigured() }));
      return;
    case '/api/counts':
      return ok(res, await getCounts());
    case '/api/organizations':
      return ok(res, await listOrganizations());
    case '/api/users':
      return ok(res, await listUsers());
    case '/api/audit/actions':
      return ok(res, await listAuditActions());
    case '/api/audit':
      return ok(
        res,
        await listAuditLog({
          action: str(search.get('action')),
          organizationId: str(search.get('organizationId')),
        }),
      );
    default:
      return err(res, 404, 'Non trovato.');
  }
}

async function handlePost(pathname: string, body: Record<string, unknown>, res: ServerResponse) {
  switch (pathname) {
    case '/api/organizations/credits': {
      const organizationId = str(body.organizationId);
      if (!organizationId) return err(res, 400, 'ID organizzazione mancante.');

      // Two independent, optional balances: plan credits (overwritten monthly by
      // the renewal) and purchased credits (never overwritten). Omitting one
      // leaves that column exactly as it is.
      const parse = (v: unknown, label: string): number | undefined | string => {
        if (v === undefined || v === null || v === '') return undefined;
        if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
          return `${label}: serve un intero >= 0.`;
        }
        return v;
      };
      const plan = parse(body.plan, 'Crediti di piano');
      const purchased = parse(body.purchased, 'Crediti acquistati');
      if (typeof plan === 'string') return err(res, 400, plan);
      if (typeof purchased === 'string') return err(res, 400, purchased);
      if (plan === undefined && purchased === undefined) {
        return err(res, 400, 'Indicare almeno uno fra crediti di piano e crediti acquistati.');
      }
      return ok(res, await setCredits(organizationId, { plan, purchased }));
    }

    case '/api/organizations/plan': {
      const organizationId = str(body.organizationId);
      const plan = str(body.plan);
      if (!organizationId) return err(res, 400, 'ID organizzazione mancante.');
      if (!plan || !(VALID_PLANS as readonly string[]).includes(plan)) {
        return err(res, 400, `Piano non valido. Ammessi: ${VALID_PLANS.join(', ')}.`);
      }
      return ok(res, await setPlan(organizationId, plan as ValidPlan));
    }

    case '/api/users/role': {
      const userId = str(body.userId);
      const organizationId = str(body.organizationId);
      const role = str(body.role);
      if (!userId || !organizationId) return err(res, 400, 'Servono id utente e id organizzazione.');
      if (!role || !(VALID_ROLES as readonly string[]).includes(role)) {
        return err(res, 400, `Ruolo non valido. Ammessi: ${VALID_ROLES.join(', ')}.`);
      }
      return ok(res, await setMemberRole(userId, organizationId, role as ValidRole));
    }

    case '/api/users/unblock': {
      const userId = str(body.userId);
      if (!userId) return err(res, 400, 'ID utente mancante.');
      return ok(
        res,
        await unblockAccount({
          userId,
          organizationId: str(body.organizationId),
          clearDeletion: body.clearDeletion === true,
          restoreOwner: body.restoreOwner === true,
        }),
      );
    }

    case '/api/insights/count': {
      const count = await countInsightsMatching({
        organizationId: str(body.organizationId),
        status: str(body.status),
        olderThanDays: typeof body.olderThanDays === 'number' ? body.olderThanDays : undefined,
      });
      return ok(res, { count });
    }

    case '/api/insights/delete':
      // deleteInsights itself refuses an empty filter — the server does not
      // second-guess it, so there is exactly ONE place that rule lives.
      return ok(
        res,
        await deleteInsights({
          organizationId: str(body.organizationId),
          status: str(body.status),
          olderThanDays: typeof body.olderThanDays === 'number' ? body.olderThanDays : undefined,
        }),
      );

    case '/api/rows/delete': {
      const table = str(body.table);
      const id = str(body.id);
      if (!table || !(DELETABLE_TABLES as readonly string[]).includes(table)) {
        return err(res, 400, `Tabella non ammessa. Ammesse: ${DELETABLE_TABLES.join(', ')}.`);
      }
      if (!id) return err(res, 400, 'ID riga mancante.');
      return ok(res, await deleteRowById(table as DeletableTable, id));
    }

    case '/api/cron/run': {
      const job = str(body.job);
      if (!job || !(CRON_JOBS as readonly string[]).includes(job)) {
        return err(res, 400, `Cron non ammesso. Ammessi: ${CRON_JOBS.join(', ')}.`);
      }
      return ok(res, await runCron(job as CronJob));
    }

    default:
      return err(res, 404, 'Non trovato.');
  }
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  if (!hostIsAllowed(req)) {
    return err(res, 403, 'Host non ammesso.');
  }

  // Base for resolving the relative req.url into a URL object only — not the
  // actual bind address, which is why 127.0.0.1 here is fine even when
  // BIND_HOST is 0.0.0.0.
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname;

  if (req.method === 'GET') {
    return handleGet(pathname, url.searchParams, res);
  }

  if (req.method === 'POST') {
    // Every mutating route is behind the token. Checked BEFORE the body is
    // read or any handler runs.
    if (req.headers['x-admin-token'] !== CSRF_TOKEN) {
      return err(res, 403, 'Token non valido: ricarica la pagina del pannello.');
    }
    let body: Record<string, unknown>;
    try {
      body = await readJsonBody(req);
    } catch (e) {
      return err(res, 400, `Corpo non valido: ${(e as Error).message}`);
    }
    return handlePost(pathname, body, res);
  }

  return err(res, 405, 'Metodo non ammesso.');
}

function main() {
  try {
    assertSafeToStart();
  } catch (e) {
    if (e instanceof AdminStartupError) {
      console.error(`\n[admin] AVVIO RIFIUTATO\n\n${e.message}\n`);
      process.exit(1);
    }
    throw e;
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((e: unknown) => {
      const message = e instanceof Error ? e.message : 'Errore sconosciuto';
      // Logged for the operator, and returned so the panel can show what went
      // wrong instead of failing silently. Never includes CRON_SECRET: runCron
      // only ever puts it in a header, never in an error message.
      console.error('[admin] errore:', message);
      if (!res.headersSent) err(res, 500, message);
    });
  });

  server.listen(PORT, BIND_HOST, () => {
    console.log('\n  ┌──────────────────────────────────────────────────────────┐');
    console.log('  │  Anlyra — pannello admin (SOLO LOCALE)                    │');
    console.log('  └──────────────────────────────────────────────────────────┘');
    console.log(`\n  In ascolto su  http://${BIND_HOST}:${PORT}`);
    console.log('  Database:      PRODUZIONE — le modifiche sono immediate e reali.');
    console.log(
      `  Cron:          ${isCronSecretConfigured() ? 'disponibili' : 'DISATTIVATI (CRON_SECRET assente)'}`,
    );

    if (isCodespace()) {
      const url = codespaceUrl(PORT);
      console.log('\n  ⚠️  SICUREZZA — porta inoltrata dal Codespace:');
      console.log('      Nella scheda PORTS di VS Code questa porta deve restare "Private".');
      console.log('      NON impostarla mai su "Public": diventerebbe raggiungibile da chiunque');
      console.log('      abbia il link, senza login, con accesso pieno al database di produzione.');
      if (url) {
        console.log(`\n  Apri nel browser:  ${url}`);
      } else {
        console.log(
          '\n  Impossibile calcolare il link (CODESPACE_NAME non letta): apri la scheda PORTS di',
        );
        console.log(`  VS Code, trova la porta ${PORT} e aprila da lì.`);
      }
    } else {
      console.log(`\n  Apri nel browser:  http://127.0.0.1:${PORT}`);
    }
    console.log('\n  Ferma con Ctrl+C.\n');
  });

  server.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') {
      console.error(
        `\n[admin] La porta ${PORT} è già occupata.\n` +
          `Chiudi l'altro processo, oppure usa un'altra porta:  ADMIN_PORT=3002 npm run admin\n`,
      );
      process.exit(1);
    }
    throw e;
  });
}

main();
