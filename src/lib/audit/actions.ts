/**
 * The closed set of audited actions. A union type rather than free-form strings
 * so a typo becomes a compile error instead of a row nobody can ever query.
 *
 * SCOPE (founder's decision): destructive/management actions, authentication
 * events, and data imports. AI generations are deliberately NOT audited — they
 * are frequent and the credit ledger (CreditEntry) already traces them.
 *
 * That last clause was a promise the code did not keep until the ledger was
 * completed: 'ai_call' was one of four causali the schema declared and none of
 * them but 'purchase' was ever written, so AI generations left no trace
 * anywhere. Every credit movement is now recorded — see recordCreditEntry in
 * @/lib/credits — which is what makes leaving them out of the audit log a
 * reasonable trade rather than a blind spot.
 */
export const AUDIT_ACTIONS = [
  // ── Destructive: the six DELETE routes already behind requireManagerRole ──
  'receivable.delete',
  'recurring_expense.delete',
  'report.delete',
  'custom_dashboard.delete',
  'import_batch.delete',
  'competitor.delete',

  // ── Organization / integration management (also behind requireManagerRole) ──
  'organization.update',
  'report.update',
  'integration.connect',
  'integration.disconnect',
  'integration.sync',
  'integration.frequency_update',

  // ── Account security ──
  'auth.login',
  'auth.login_failed',
  'password.change',
  'two_factor.enable',
  'two_factor.disable',

  // ── GDPR ──
  'gdpr.export',
  'gdpr.account_deletion_request',

  // ── Data imports ──
  'import.commit',
  'import.rollback',

  // ── Report sharing (exposes company figures publicly, no login required) ──
  'report.share_link_created',

  // ── Scheduled report delivery (cron-triggered, no acting user) ──
  'report.scheduled_delivery',

  // ── Billing: credit movements that are NOT ordinary AI consumption ──
  // (consumption itself stays unaudited — see the SCOPE note above.) These two
  // change the balance without the org doing anything, so they need a trail:
  // one is the cron resetting it, the other is money changing hands.
  'credits.monthly_renewal',
  'credits.purchase',

  // ── Team management (behind requireManagerRole, changes who can see the
  // company's data and with what powers) ──
  'team.member_role_changed',
  'team.member_removed',

  // ── Support ──
  'support.bug_report',

  // ── Local admin panel (admin/, founder-only, never deployed) ──
  // Deliberately prefixed 'admin.' so a single query separates operator actions
  // from anything a normal user did. These rows carry NO userId (the panel has
  // no login — it is protected by running only on the founder's localhost), so
  // the prefix is the only way to tell them apart.
  'admin.credits_set',
  'admin.plan_set',
  'admin.member_role_set',
  'admin.insights_deleted',
  'admin.row_deleted',
  'admin.account_unblocked',
  'admin.cron_triggered',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditOutcome = 'success' | 'failure';
