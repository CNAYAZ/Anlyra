import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/rate-limit';
import type { AuditAction, AuditOutcome } from './actions';

export type { AuditAction, AuditOutcome } from './actions';

/**
 * Shared audit writer. ONE place that touches the AuditLog table, so the twenty
 * call sites stay a single line each and the privacy rules below are enforced
 * once instead of being re-remembered per route.
 *
 * ── NEVER FAILS THE CALLER ──
 * Every write is wrapped: if the audit insert throws (table missing because the
 * migration has not been deployed yet, database hiccup, anything), the error is
 * logged to the server console and the function returns normally. An audit
 * failure must never turn a successful user action into an error — losing one
 * trail row is bad, refusing a paying customer's delete because of it is worse.
 *
 * ── PRIVACY ──
 * Record THAT an action happened, never its payload. Do not pass passwords,
 * tokens, imported file contents, or financial amounts in `metadata`. Keep
 * `metadata` to small, non-sensitive context: which provider, how many rows.
 */

/** Bounds a stored string so a pathological value cannot bloat the table. */
const MAX_METADATA_CHARS = 1000;
const MAX_FIELD_CHARS = 255;

export type AuditEntry = {
  action: AuditAction;
  /** Who acted. Omit for a failed login against an address with no account. */
  userId?: string | null;
  /** Which organization the action targeted. Omit for account-level events. */
  organizationId?: string | null;
  /** What was acted on, when there is a specific target. */
  targetType?: string | null;
  targetId?: string | null;
  /** Defaults to 'success'. */
  outcome?: AuditOutcome;
  /**
   * The request, used ONLY to read the caller IP through the same helper the
   * rate limiter uses (x-real-ip first, anti-spoofing). Pass it when the route
   * already has it; never fabricate one.
   */
  req?: Request | null;
  /** Small non-sensitive JSON-serializable context. See the privacy note above. */
  metadata?: Record<string, string | number | boolean | null> | null;
};

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    let metadata: string | null = null;
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      metadata = truncate(JSON.stringify(entry.metadata), MAX_METADATA_CHARS);
    }

    await prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId ?? null,
        organizationId: entry.organizationId ?? null,
        targetType: truncate(entry.targetType, MAX_FIELD_CHARS),
        targetId: truncate(entry.targetId, MAX_FIELD_CHARS),
        outcome: entry.outcome ?? 'success',
        ip: entry.req ? truncate(getClientIp(entry.req), MAX_FIELD_CHARS) : null,
        metadata,
      },
    });
  } catch (err) {
    // Deliberately swallowed — see the "NEVER FAILS THE CALLER" note above.
    console.error('[audit] failed to record', entry.action, err);
  }
}
