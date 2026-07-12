import Anthropic from '@anthropic-ai/sdk';

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
export const ANTHROPIC_TEMPERATURE = 0.4;
export const ANTHROPIC_MAX_TOKENS = 2048;

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

export async function chatComplete(
  systemPrompt: string,
  messages: ChatTurn[],
): Promise<{ text: string; tokensIn?: number; tokensOut?: number }> {
  const c = getAnthropicClient();
  const res = await c.messages.create({
    model: ANTHROPIC_MODEL,
    // temperature is deprecated/rejected by claude-sonnet-5 (400
    // invalid_request_error), so it is intentionally not passed.
    max_tokens: ANTHROPIC_MAX_TOKENS,
    system: systemPrompt,
    messages,
  });
  const block = res.content.find((b) => b.type === 'text');
  const text = block && block.type === 'text' ? block.text : '';
  return {
    text,
    tokensIn: res.usage?.input_tokens,
    tokensOut: res.usage?.output_tokens,
  };
}
