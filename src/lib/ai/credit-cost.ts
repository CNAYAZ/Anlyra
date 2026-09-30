import { mappedModelFor, type AiSurface } from '@/lib/ai/models';

/**
 * HOW MANY CREDITS AN AI OPERATION COSTS — the one place that decides it.
 *
 * Founder's decision (2026-09-30): an operation no longer costs a fixed number
 * of credits; it costs what the model actually used, converted at ONE rate.
 * Before the call the route reserves the operation's MAXIMUM (consumeCredits,
 * the atomic statement), after the call it gives back the difference
 * (settleAiCredits in @/lib/credits). This file only does arithmetic: no
 * database, no env, so the browser can import it to print the same numbers the
 * server charges.
 */

/** Credits per US dollar of real cost: 1 credit = 0.02 $. Founder's decision. */
export const CREDITS_PER_USD = 50;

/**
 * Anthropic list prices, in US CENTS per million tokens (cents keep the
 * arithmetic in integers: every price below is a whole number of cents).
 * Read on the official pricing page (platform.claude.com/docs/en/about-claude/pricing)
 * on 2026-09-30. `cacheWrite` is the 5-minute cache write, the only TTL this
 * app uses (see ChatCompleteOptions.cacheSystemPrompt).
 * A model missing from this table is never guessed at: see chargeFor.
 */
type ModelPrice = { input: number; cacheWrite: number; cacheRead: number; output: number };
const MODEL_PRICE_CENTS_PER_MTOK: Record<string, ModelPrice> = {
  'claude-sonnet-5': { input: 200, cacheWrite: 250, cacheRead: 20, output: 1000 },
  'claude-haiku-4-5': { input: 100, cacheWrite: 125, cacheRead: 10, output: 500 },
};

/**
 * The four counters Anthropic returns on every response. Thinking has no
 * counter of its own: it is inside `output` and billed at the output price.
 */
export type AiUsage = { input: number; output: number; cacheRead: number; cacheWrite: number };

/** Every operation that spends credits. */
export type AiOperation = 'chat' | 'analyze' | 'insights' | 'alerts';

type OperationLimits = {
  surface: AiSurface;
  /** max_tokens sent to the model: the ceiling on output (answer + thinking). */
  maxOutputTokens: number;
  /**
   * The input the maximum is sized for, priced as if all of it were a cache
   * WRITE (the dearest way input can be billed). A request with more input can
   * cost more than the maximum; the customer is still charged only the
   * maximum they were shown, and the rest is ours (logged by the routes).
   */
  inputAllowanceTokens: number;
  /**
   * ESTIMATE of an ordinary call, used only for the "circa N" on the buttons.
   * Not a measurement: the real figures are the [ai:usage] lines in the
   * production logs, and these should be replaced by them.
   */
  typicalUsage: AiUsage;
};

/**
 * Founder's decision on the ceilings (2026-09-30): alerts 2,000 output tokens,
 * chat and analyze 8,000, insights 16,000 (a truncated JSON array is unusable).
 */
export const AI_OPERATIONS: Record<AiOperation, OperationLimits> = {
  // Business context ~2,000 tokens (cached after the first message) + question.
  chat: {
    surface: 'chat',
    maxOutputTokens: 8000,
    inputAllowanceTokens: 20000,
    typicalUsage: { input: 500, cacheRead: 2000, cacheWrite: 0, output: 1500 },
  },
  // Up to 20 earlier turns of 8,000 characters each + a 4,000-character question.
  analyze: {
    surface: 'analyze',
    maxOutputTokens: 8000,
    inputAllowanceTokens: 60000,
    typicalUsage: { input: 100, cacheRead: 0, cacheWrite: 3000, output: 3000 },
  },
  insights: {
    surface: 'insights',
    maxOutputTokens: 16000,
    inputAllowanceTokens: 10000,
    typicalUsage: { input: 4000, cacheRead: 0, cacheWrite: 0, output: 2500 },
  },
  // Measured at ~600 input and ~300 output tokens (see @/lib/ai/models).
  alerts: {
    surface: 'alerts',
    maxOutputTokens: 2000,
    inputAllowanceTokens: 2000,
    typicalUsage: { input: 600, cacheRead: 0, cacheWrite: 0, output: 300 },
  },
};

/**
 * Credits for `usage` on `model`: ALWAYS ROUNDED UP, never less than 1.
 * null when the model has no price in the table above.
 *
 * Integer arithmetic on purpose: tokens × cents is a whole number, and the
 * rounding-up is done by comparing products, so a cost of exactly N credits is
 * N and never N+1 because of a floating-point residue.
 */
export function creditsForUsage(model: string, usage: AiUsage): number | null {
  const price = MODEL_PRICE_CENTS_PER_MTOK[model];
  if (!price) return null;
  const centTokens =
    usage.input * price.input +
    usage.cacheWrite * price.cacheWrite +
    usage.cacheRead * price.cacheRead +
    usage.output * price.output;
  // credits = centTokens / (100 cents × 1,000,000 tokens) × CREDITS_PER_USD
  const numerator = centTokens * CREDITS_PER_USD;
  const denominator = 100 * 1_000_000;
  let credits = Math.floor(numerator / denominator);
  if (credits * denominator < numerator) credits += 1;
  return Math.max(1, credits);
}

/**
 * The most an operation can cost, shown BEFORE the call and reserved by the
 * route. Priced on the model the operation is mapped to (not an env override),
 * so server and browser compute the same number.
 */
export function maxCreditsFor(operation: AiOperation): number {
  const op = AI_OPERATIONS[operation];
  return creditsForUsage(mappedModelFor(op.surface), {
    input: 0,
    cacheRead: 0,
    cacheWrite: op.inputAllowanceTokens,
    output: op.maxOutputTokens,
  }) as number;
}

/** "Circa N" on the buttons — an estimate, see OperationLimits.typicalUsage. */
export function typicalCreditsFor(operation: AiOperation): number {
  const op = AI_OPERATIONS[operation];
  return Math.min(
    creditsForUsage(mappedModelFor(op.surface), op.typicalUsage) as number,
    maxCreditsFor(operation),
  );
}

/**
 * What a finished call is charged: its real cost, but never more than the
 * maximum the customer was shown. `usage` null (the call produced no usage we
 * could read) or a model with no price → the maximum, which is what was
 * reserved and what the customer agreed to; the caller logs it.
 */
export function chargeFor(operation: AiOperation, model: string, usage: AiUsage | null): number {
  const max = maxCreditsFor(operation);
  if (!usage) return max;
  const real = creditsForUsage(model, usage);
  if (real === null) {
    console.warn(`[ai:credits] ${operation} model=${model} has no price: charged the maximum (${max})`);
    return max;
  }
  if (real > max) {
    console.warn(`[ai:credits] ${operation} model=${model} cost ${real} credits, above the maximum ${max}: charged ${max}`);
    return max;
  }
  return real;
}
