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
  // Not a security event but the RECORD OF A CONTRACT: written once, when the
  // account is created, by whoever ticked "I have read privacy and terms and I
  // am at least 18". It is what makes that sentence in the legal pages true, so
  // it is the one action a retention sweep must never remove.
  'auth.terms_accepted',
  // Same kind of record: the box ticked BEFORE entering the card, with the
  // exact text shown (the trial rule and the amount of the chosen plan) — see
  // src/lib/billing/trial-rule.ts. Kept like the acceptance of the Terms.
  'billing.trial_rule_accepted',
  // A trial that did not start because the card (or, in a race, the VAT
  // number) had already had one: the subscription was charged at once.
  'billing.trial_denied',
  'password.change',
  // Distinct from password.change: this one happens with NO session at all,
  // proven only by holding the emailed reset link (/api/auth/reset-password),
  // never by a bcrypt check of the old password. Kept separate so the trail
  // can tell "signed in and changed it" apart from "used a reset link" —
  // the second is the one to look at first if it was not the account owner.
  'password.reset',
  // "Sign out of all other devices" from Settings → Security. A password
  // change revokes sessions too, but is already recorded as password.change.
  'auth.sessions_revoked',
  'two_factor.enable',
  'two_factor.disable',

  // ── GDPR ──
  'gdpr.export',
  'gdpr.account_deletion_request',
  'gdpr.account_deletion_cancelled',
  // The owner asks to delete the whole company: recorded as WAITING for the
  // founder's confirmation (Organization.deletionApprovalRequestedAt), nothing
  // is deleted or blocked yet — and withdrawn by the owner before that.
  'gdpr.org_deletion_approval_requested',
  'gdpr.org_deletion_approval_withdrawn',
  // Data of a trial that never became a subscription: notice sent, then deleted
  // 12 months after the trial ended (src/lib/cron/trial-data-retention.ts).
  'trial_data.deletion_notice',
  'trial_data.purged',

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
  // The owner saved the invoicing data (Organization.billing* / vatNumber):
  // what the founder copies into the electronic invoice.
  'billing.details_update',

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
  // The founder's answer to a waiting company-deletion request.
  'admin.org_deletion_confirmed',
  'admin.org_deletion_rejected',
  // Register of trials (TrialClaim): a person reviewed a row and granted the
  // trial anyway (art. 22 GDPR); the one-off fill from the companies that
  // already had a trial.
  'admin.trial_claim_review_granted',
  'admin.trial_claims_backfilled',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditOutcome = 'success' | 'failure';
