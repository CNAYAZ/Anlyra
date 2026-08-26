import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { getAuthContext } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { consumeCredits, InsufficientCreditsError } from '@/lib/credits';
import {
  chatComplete,
  isAnthropicConfigured,
  MISSING_KEY_MESSAGE,
} from '@/lib/ai/client';
import { buildSystemPrompt, loadBusinessContext } from '@/lib/ai-context';

export const dynamic = 'force-dynamic';

const SendSchema = z.object({
  conversationId: z.string().nullable().optional(),
  message: z.string().min(1).max(4000),
});

type DbMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
};

type DbConversation = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: DbMessage[];
};

function toMessageDTO(m: DbMessage) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}

function toConversationDTO(c: DbConversation) {
  return {
    id: c.id,
    title: c.title,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    messages: c.messages.map(toMessageDTO),
  };
}

export async function POST(req: NextRequest) {
  if (!isAnthropicConfigured()) {
    return fail(MISSING_KEY_MESSAGE, 503);
  }

  const ctx = await getAuthContext();
  if (!ctx) return fail('Unauthorized', 401);
  const { userId, organizationId } = ctx;

  const json = await req.json().catch(() => null);
  const parsed = SendSchema.safeParse(json);
  if (!parsed.success) return fail('INVALID_INPUT', 400);

  const { conversationId, message } = parsed.data;

  let creditsRemaining: number;
  try {
    creditsRemaining = await consumeCredits(organizationId, 1);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return fail('INSUFFICIENT_CREDITS', 402);
    }
    throw err;
  }

  let conversation = conversationId
    ? await prisma.aIConversation.findFirst({
        where: { id: conversationId, organizationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
    : null;

  if (!conversation) {
    const title = message.slice(0, 60).trim() + (message.length > 60 ? '…' : '');
    conversation = await prisma.aIConversation.create({
      data: { organizationId, userId, title },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  await prisma.aIMessage.create({
    data: { conversationId: conversation.id, role: 'USER', content: message },
  });

  const businessCtx = await loadBusinessContext(organizationId);
  const systemPrompt = buildSystemPrompt(businessCtx, 'IT');

  const priorMessages = await prisma.aIMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
  });

  let assistantText = '';
  let tokensIn: number | undefined;
  let tokensOut: number | undefined;

  try {
    const result = await chatComplete(
      systemPrompt,
      priorMessages.map((m) => ({
        role: m.role === 'USER' ? 'user' : 'assistant',
        content: m.content,
      })),
      {
        // System prompt: the org's business-context JSON (financials, facts,
        // scadenzario, spese ricorrenti) — identical for this org across ALL
        // of its conversations on the same calendar day (see the prompt
        // caching report on why: daysOverdueOf truncates to whole days, so
        // nothing inside it changes call to call absent new underlying data).
        // Reused across conversations, not just within one.
        cacheSystemPrompt: true,
        // Conversation history: every message resends the full prior thread.
        // Marking the last one lets each new turn build on what the previous
        // turn already cached, instead of reprocessing the whole history at
        // full price on every single message.
        cacheLastMessage: true,
        logLabel: 'chat',
        // Full business context + open-ended question: stays on the default
        // model (see @/lib/ai/models).
        surface: 'chat',
      },
    );
    assistantText = result.text;
    tokensIn = result.tokensIn;
    tokensOut = result.tokensOut;
  } catch (err) {
    console.error('Anthropic API error:', err);
    const msg = err instanceof Error ? err.message : 'AI request failed';
    return fail(msg, 502);
  }

  await prisma.aIMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content: assistantText,
      tokensIn,
      tokensOut,
    },
  });

  await prisma.aIConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  const refreshed = await prisma.aIConversation.findUniqueOrThrow({
    where: { id: conversation.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  return ok({
    conversation: toConversationDTO(refreshed),
    creditsRemaining,
  });
}
