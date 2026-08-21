import Anthropic from '@anthropic-ai/sdk';

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
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

export type ChatCompleteOptions = {
  /** Overrides ANTHROPIC_MAX_TOKENS for this call only; other callers are unaffected. */
  maxTokens?: number;
  /**
   * Assistant-turn prefill: appended as a trailing `{role:'assistant', ...}`
   * message so the API is forced to continue the response from exactly this
   * string — the standard way to pin a structured-output reply to a known
   * first character (e.g. "[") without a dedicated "JSON mode" flag, which
   * the Messages API does not have.
   *
   * IMPORTANT: per Anthropic's API, when the last input message has the
   * assistant role, `response.content` holds ONLY the model's continuation —
   * the prefill text itself is never echoed back. chatComplete re-attaches it
   * here so callers always get the complete string back, exactly as if the
   * model had written the whole thing itself.
   */
  assistantPrefill?: string;
};

export async function chatComplete(
  systemPrompt: string,
  messages: ChatTurn[],
  options: ChatCompleteOptions = {},
): Promise<{ text: string; tokensIn?: number; tokensOut?: number }> {
  const c = getAnthropicClient();
  const finalMessages = options.assistantPrefill
    ? [...messages, { role: 'assistant' as const, content: options.assistantPrefill }]
    : messages;
  const res = await c.messages.create({
    model: ANTHROPIC_MODEL,
    // temperature is deprecated/rejected by claude-sonnet-5 (400
    // invalid_request_error), so it is intentionally not passed.
    max_tokens: options.maxTokens ?? ANTHROPIC_MAX_TOKENS,
    system: systemPrompt,
    messages: finalMessages,
  });
  const block = res.content.find((b) => b.type === 'text');
  const continuation = block && block.type === 'text' ? block.text : '';
  const text = options.assistantPrefill ? options.assistantPrefill + continuation : continuation;
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
): AsyncGenerator<string> {
  const c = getAnthropicClient();
  const stream = c.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: ANTHROPIC_MAX_TOKENS,
    system: systemPrompt,
    messages,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
