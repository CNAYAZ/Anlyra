import Anthropic from '@anthropic-ai/sdk';

/**
 * WHEN ANTHROPIC REFUSES A CALL BECAUSE OF MONEY — one definition, used by every
 * AI route.
 *
 * The founder's Anthropic account has a monthly spend limit (5 USD), shared by
 * the demo and the real customers. When it runs out the model stops answering
 * for EVERYONE; that is our problem, not the customer's, so:
 *   • no credit is charged (the route refunds the whole reservation);
 *   • the customer is told the AI service is temporarily unavailable, and not
 *     why (AI_UNAVAILABLE → common.aiUnavailable);
 *   • one recognisable line goes to the server log: [ai:spend-limit].
 *
 * ── WHAT ANTHROPIC SENDS (read on its documentation, 2026-10: "Claude API
 *    errors" and "Rate limits → Spend limits") ──
 *   • a spend limit the organization set itself, or a workspace limit:
 *     HTTP 400, error.type "invalid_request_error", message beginning
 *     "You have reached your specified API usage limits" (or "... specified
 *     workspace API usage limits"). A 400, so it looks like a malformed request.
 *   • the tier's own monthly spend cap: HTTP 429, error.type "rate_limit_error",
 *     NO retry-after header, error.details.error_code "enforced_spend_limit_reached".
 *     Other 429s are ordinary rate limits and are NOT matched here.
 *   • a billing or payment problem: HTTP 402, error.type "billing_error".
 *   • an empty credit balance: the documentation page above does not spell it
 *     out. Reports from other developers, not Anthropic's own pages, say it
 *     arrives as HTTP 400 "invalid_request_error" with the message "Your credit
 *     balance is too low to access the Anthropic API ...". Matched by that text.
 * The 400 cases can only be recognised by their message: the status alone would
 * also match "prompt is too long" and every other malformed request.
 */
export const AI_UNAVAILABLE = 'AI_UNAVAILABLE';

/** 503: "temporarily unavailable", and not 429 (nothing the customer can fix by waiting a minute). */
export const AI_UNAVAILABLE_STATUS = 503;

const SPEND_LIMIT_400 = /reached your specified (workspace )?API usage limits|credit balance is too low/i;
const SPEND_LIMIT_429 = /enforced_spend_limit_reached/;

export function isAnthropicSpendLimitError(err: unknown): boolean {
  if (!(err instanceof Anthropic.APIError)) return false;
  // The SDK builds the message from the response body, so it carries the error
  // text and details; the parsed body is checked too for the structured code.
  const body = err.error as { error?: { message?: string; details?: { error_code?: string } } } | undefined;
  const text = `${err.message} ${body?.error?.message ?? ''}`;
  if (err.status === 402) return true;
  if (err.status === 429) {
    return body?.error?.details?.error_code === 'enforced_spend_limit_reached' || SPEND_LIMIT_429.test(text);
  }
  if (err.status === 400) return SPEND_LIMIT_400.test(text);
  return false;
}

/**
 * The searchable line for the founder: grep `[ai:spend-limit]` in the Vercel
 * logs. Carries Anthropic's own message, which says when access resumes.
 */
export function logAnthropicSpendLimit(surface: string, err: unknown): void {
  const e = err as InstanceType<typeof Anthropic.APIError>;
  console.error(
    `[ai:spend-limit] surface=${surface} status=${e.status} request_id=${e.request_id ?? '-'} ` +
      `Anthropic ha rifiutato la chiamata: limite di spesa o saldo esauriti. ` +
      `Nessun credito addebitato al cliente, servizio AI non disponibile. ` +
      `Risposta di Anthropic: ${String(e.message).slice(0, 400)}`,
  );
}
