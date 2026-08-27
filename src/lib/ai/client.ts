import Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_AI_MODEL, modelFor, type AiSurface } from '@/lib/ai/models';

/**
 * The model used when a caller names no surface. Kept exported because it was
 * exported before; the per-surface choice now lives in @/lib/ai/models.
 */
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || DEFAULT_AI_MODEL;
export const ANTHROPIC_TEMPERATURE = 0.4;
export const ANTHROPIC_MAX_TOKENS = process.env.ANTHROPIC_MAX_TOKENS
  ? parseInt(process.env.ANTHROPIC_MAX_TOKENS, 10)
  : 4096;

export const MISSING_KEY_MESSAGE =
  'Per usare la chat AI, aggiungi ANTHROPIC_API_KEY nel file .env.local';

let client: Anthropic | null = null;

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropicClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(MISSING_KEY_MESSAGE);
  }
  client = new Anthropic({ apiKey });
  return client;
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/**
 * ── PROMPT CACHING — why the two interfaces below exist ──
 *
 * The installed @anthropic-ai/sdk (0.32.1, predates prompt caching's
 * graduation to general availability) does not declare `cache_control` on the
 * PLAIN (non-beta) Messages types used by this file — only on the separate
 * `client.beta.messages` surface, which posts to a different endpoint variant
 * (`/v1/messages?beta=true`). Switching this file to that namespace would mean
 * cached and non-cached calls no longer go through the exact same client
 * method and endpoint, which is a bigger behavioural fork than this feature
 * needs.
 *
 * `cache_control` on the PLAIN endpoint is GA today — no beta header required
 * (Anthropic's own docs confirm this). So the two interfaces below only WIDEN
 * the TypeScript view of the request/response JSON to match what the live API
 * already accepts and returns; they change nothing about the bytes sent over
 * the wire. Safe to delete once the SDK dependency is upgraded to a version
 * whose own types include these fields natively.
 */
interface CacheableTextBlock extends Anthropic.TextBlockParam {
  cache_control?: { type: 'ephemeral' };
}
interface UsageWithCache extends Anthropic.Usage {
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export type ChatCompleteOptions = {
  /** Overrides ANTHROPIC_MAX_TOKENS for this call only; other callers are unaffected. */
  maxTokens?: number;
  /**
   * Opt-in prompt caching for the system prompt. Omitting this (and the two
   * fields below) keeps the request byte-for-byte identical to before this
   * feature existed — `system` stays a plain string, no `cache_control`
   * anywhere — which is what makes the extension backward compatible.
   *
   * Only worth turning on where CLOSE-TOGETHER calls will actually re-read
   * what this one writes: a single isolated call pays the ~1.25x cache-write
   * premium and never earns back the 0.1x read discount. See the prompt
   * caching report for which of the app's AI surfaces qualify and why.
   * TTL is fixed at the 5-minute default (ephemeral) — the only form these
   * installed SDK types can express, and also what every caching call site in
   * this app currently uses; nowhere here has evidence to justify the 1-hour
   * TTL's doubled write cost.
   */
  cacheSystemPrompt?: boolean;
  /**
   * ALSO marks the LAST entry in `messages` as its own cache breakpoint — for
   * a conversation that grows turn by turn, where every request resends the
   * full history. Independent of `cacheSystemPrompt`: this app never sets
   * both to false while wanting a cached prefix, but the flags don't require
   * each other structurally. No-op when `messages` is empty.
   */
  cacheLastMessage?: boolean;
  /** Short label for the usage log line only (see logUsage) — never sent to the API. */
  logLabel?: string;
  /**
   * Which AI surface this call belongs to — decides WHICH MODEL is used (see
   * @/lib/ai/models). Omitting it keeps the pre-existing behaviour: the default
   * model. A caller that forgets it therefore overpays; it never silently
   * downgrades the answer.
   */
  surface?: AiSurface;
};

function buildSystemParam(
  systemPrompt: string,
  cache: boolean | undefined,
): string | CacheableTextBlock[] {
  if (!cache) return systemPrompt;
  return [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }];
}

function buildMessagesParam(
  messages: ChatTurn[],
  cacheLast: boolean | undefined,
): Anthropic.MessageParam[] {
  if (!cacheLast || messages.length === 0) return messages;
  return messages.map(
    (m, i): Anthropic.MessageParam =>
      i === messages.length - 1
        ? {
            role: m.role,
            content: [
              { type: 'text', text: m.content, cache_control: { type: 'ephemeral' } } as CacheableTextBlock,
            ],
          }
        : m,
  );
}

/**
 * Logs prompt-caching effectiveness for one AI call — NUMBERS ONLY, never the
 * prompt text or the model's response. Left on in production on purpose,
 * mirroring the numbers-only logging already used in insights-generation.ts's
 * logInvalidResponse: the only way to know whether caching is paying off is
 * under REAL traffic, which local development cannot reproduce. See the
 * prompt caching report for how to read `cacheRead`/`cacheWrite`.
 */
function logUsage(label: string, model: string, usage: Anthropic.Usage | undefined): void {
  if (!usage) return;
  const withCache = usage as UsageWithCache;
  const cacheRead = withCache.cache_read_input_tokens ?? 0;
  const cacheWrite = withCache.cache_creation_input_tokens ?? 0;
  // `model` is on the line because tokens alone cannot tell you what a call
  // COST: the same token counts are worth different money on different models.
  // Without it there is no way to check from the logs that a per-surface choice
  // is actually in force in production, nor to attribute the bill.
  console.info(
    `[ai:usage] ${label} model=${model} input=${usage.input_tokens} output=${usage.output_tokens} ` +
      `cacheRead=${cacheRead} cacheWrite=${cacheWrite}`,
  );
}

/**
 * The model for this call: the surface's choice, or the default when the caller
 * named no surface.
 */
function resolveModel(options: ChatCompleteOptions): string {
  return options.surface ? modelFor(options.surface) : ANTHROPIC_MODEL;
}

export async function chatComplete(
  systemPrompt: string,
  messages: ChatTurn[],
  options: ChatCompleteOptions = {},
): Promise<{ text: string; tokensIn?: number; tokensOut?: number }> {
  const c = getAnthropicClient();
  const model = resolveModel(options);
  const res = await c.messages.create({
    model,
    // temperature is deprecated/rejected by claude-sonnet-5 (400
    // invalid_request_error), so it is intentionally not passed.
    max_tokens: options.maxTokens ?? ANTHROPIC_MAX_TOKENS,
    system: buildSystemParam(systemPrompt, options.cacheSystemPrompt),
    messages: buildMessagesParam(messages, options.cacheLastMessage),
  });
  logUsage(options.logLabel ?? 'chatComplete', model, res.usage);
  const block = res.content.find((b) => b.type === 'text');
  const text = block && block.type === 'text' ? block.text : '';
  return {
    text,
    tokensIn: res.usage?.input_tokens,
    tokensOut: res.usage?.output_tokens,
  };
}

/**
 * Streaming counterpart of chatComplete: yields text deltas as they arrive, so
 * the caller (the analyze route) can pipe them straight into an HTTP stream.
 * Implemented as an async generator of plain strings — the cleanest shape for a
 * Next.js App Router ReadableStream and it keeps every SDK detail inside this
 * file. Same model/max_tokens as chatComplete and, like it, NEVER passes
 * temperature (claude-sonnet-5 rejects it with a 400). chatComplete is left
 * untouched (still used by scripts and as the non-streaming path).
 */
export async function* chatStream(
  systemPrompt: string,
  messages: ChatTurn[],
  options: ChatCompleteOptions = {},
): AsyncGenerator<string> {
  const c = getAnthropicClient();
  const model = resolveModel(options);
  const stream = c.messages.stream({
    model,
    max_tokens: options.maxTokens ?? ANTHROPIC_MAX_TOKENS,
    system: buildSystemParam(systemPrompt, options.cacheSystemPrompt),
    messages: buildMessagesParam(messages, options.cacheLastMessage),
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
  // Read AFTER the loop above fully drains the stream — the documented SDK
  // pattern for getting the complete Message (and its usage, including the
  // cache fields) even when consuming events one at a time.
  try {
    const final = await stream.finalMessage();
    logUsage(options.logLabel ?? 'chatStream', model, final.usage);
  } catch (e) {
    // finalMessage() rejects if the underlying stream itself errored or was
    // aborted — that failure already propagated out of the `for await` above
    // to the caller's own try/catch (unchanged from before this feature). A
    // failure HERE is only the usage log call itself failing after a
    // successful generation, so it is swallowed rather than re-thrown: it
    // must never mask or replace a result the caller has already received.
    console.error('[ai:usage] failed to read final usage after stream:', e);
  }
}
