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
