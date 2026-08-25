/**
 * Startup guards for the admin panel.
 *
 * This process talks to the SAME Supabase database that serves anlyra.com, with
 * real customers in it, and it has no login of its own. Everything that keeps it
 * safe is in this file plus the localhost bind in server.ts. Each check below
 * fails CLOSED — refuse to start rather than start in a doubtful state.
 *
 * NOTE ON prisma/guard.ts: that guard refuses to run against the PRODUCTION
 * database. It is deliberately NOT reused here — operating on production is this
 * panel's entire purpose, so importing it would make the panel refuse to start
 * every time. The protection model is different: instead of "never touch
 * production", it is "only reachable from the founder's own machine, only when
 * explicitly asked for, and every write is confirmed and audited".
 */

export class AdminStartupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminStartupError';
  }
}

/**
 * Runs every precondition. Throws AdminStartupError with an actionable message
 * on the first failure; returns normally only when all pass.
 */
export function assertSafeToStart(): void {
  // 1. EXPLICIT OPT-IN. Nothing about this panel should ever start by accident —
  //    not from a stray `npm run` in CI, not from a script that happens to
  //    import this module. The operator has to say so on the command line.
  if (process.env.ADMIN_PANEL !== 'yes') {
    throw new AdminStartupError(
      'ADMIN_PANEL=yes non impostata.\n' +
        'Il pannello non parte per sbaglio: va chiesto esplicitamente.\n' +
        'Avvialo con:  npm run admin',
    );
  }

  // 2. NEVER IN A PRODUCTION RUNTIME. NODE_ENV=production means this is a built
  //    server process, not the founder's Codespace shell.
  if (process.env.NODE_ENV === 'production') {
    throw new AdminStartupError(
      'NODE_ENV=production: il pannello admin non deve MAI girare in un runtime di produzione.',
    );
  }

  // 3. NEVER ON VERCEL. Vercel sets VERCEL=1 in every build and every function
  //    runtime. This should be unreachable (the panel is excluded from the
  //    deploy — see .vercelignore), so it is defence in depth: if it ever DOES
  //    execute there, it dies instead of exposing an unauthenticated admin API.
  if (process.env.VERCEL) {
    throw new AdminStartupError(
      'Rilevato ambiente Vercel (VERCEL impostata): il pannello admin non gira in produzione.',
    );
  }

  // 4. A DATABASE TO TALK TO. Without this Prisma throws a long, confusing
  //    error at the first query; better to say it up front.
  if (!process.env.DATABASE_URL) {
    throw new AdminStartupError(
      'DATABASE_URL non trovata (né nell\'ambiente né in .env / .env.local).\n' +
        'Il pannello ha bisogno della connessione al database per funzionare.',
    );
  }
}

/**
 * Whether the cron buttons can work. NOT a startup blocker: the read-only and
 * database sections stay useful without it, so the panel starts and the UI
 * simply shows the cron section as unavailable.
 */
export function isCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET);
}

/**
 * ── CODESPACE PORT FORWARDING ──
 *
 * PROBLEM: binding to 127.0.0.1 only (the original design) means GitHub
 * Codespaces' port-forwarding proxy — which reaches the container over its
 * own network interface, not loopback — gets a connection-refused and the
 * browser sees a 404. Outside a Codespace this was never an issue (the
 * operator opens the browser on the SAME machine the server runs on).
 *
 * FIX: bind to 0.0.0.0 ONLY when CODESPACE_NAME shows we are inside a
 * Codespace, and compensate by narrowing the Host-header check to the exact
 * forwarded hostname (see expectedCodespaceHost) instead of relying on the
 * bind address alone. Everywhere else, 127.0.0.1 and the localhost-only Host
 * check are unchanged.
 *
 * WHY THIS IS STILL SAFE: the port GitHub forwards is PRIVATE BY DEFAULT —
 * reachable only through a browser authenticated as the Codespace's owner,
 * never from the open internet. Binding 0.0.0.0 only exposes the panel to
 * that same private tunnel, not to the container's raw network. But once
 * bound wider, the bind address itself is no longer a barrier — the Host
 * check and the CSRF token become the ONLY defenses, which is why neither is
 * loosened here.
 */

/** True only inside a GitHub Codespace — CODESPACE_NAME is set there and nowhere else. */
export function isCodespace(): boolean {
  return Boolean(process.env.CODESPACE_NAME);
}

/**
 * Domain GitHub uses to forward a Codespace's ports (normally "app.github.dev").
 * Read from GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN — GitHub's own documented
 * environment variable (docs.github.com/en/codespaces/reference/system-environment-variables)
 * — rather than hardcoded, because an Enterprise Codespaces setup can serve a
 * different domain. The literal fallback below is GitHub's own documented
 * default for that variable, used only on the rare chance the variable itself
 * is absent; it is not a guess at some OTHER domain.
 */
export function getPortForwardingDomain(): string | null {
  if (!isCodespace()) return null;
  return process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
}

/**
 * The exact Host header a browser sends when it reaches `port` through
 * GitHub's Codespaces port-forwarding proxy, or null outside a Codespace.
 * This is what the Host-header check in server.ts allows IN ADDITION to
 * localhost, once binding widens to 0.0.0.0 — never a wildcard on the whole
 * forwarding domain, which would also accept every OTHER forwarded port and
 * every other Codespace on it.
 */
export function expectedCodespaceHost(port: number): string | null {
  const name = process.env.CODESPACE_NAME;
  const domain = getPortForwardingDomain();
  if (!name || !domain) return null;
  return `${name}-${port}.${domain}`;
}

/**
 * Browser URL to open for `port` inside a Codespace, or null when it cannot be
 * computed (missing CODESPACE_NAME — should not happen once isCodespace() is
 * true, but the caller must still handle it: fall back to telling the operator
 * to use the PORTS tab rather than printing a broken URL).
 */
export function codespaceUrl(port: number): string | null {
  const host = expectedCodespaceHost(port);
  return host ? `https://${host}` : null;
}
