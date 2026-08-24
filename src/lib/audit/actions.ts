/**
 * The closed set of audited actions. A union type rather than free-form strings
 * so a typo becomes a compile error instead of a row nobody can ever query.
 *
 * SCOPE (founder's decision): destructive/management actions, authentication
 * events, and data imports. AI generations are deliberately NOT audited — they
 * are frequent and the credit ledger (CreditEntry) already traces them.
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
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditOutcome = 'success' | 'failure';
