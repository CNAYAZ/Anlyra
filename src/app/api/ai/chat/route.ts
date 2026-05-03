import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { consumeCredits, InsufficientCreditsError } from '@/lib/credits';
import { getAnthropicClient, isAnthropicConfigured, ANTHROPIC_MODEL, ANTHROPIC_TEMPERATURE } from '@/lib/anthropic';
import { buildSystemPrompt, loadBusinessContext } from '@/lib/ai-context';
import { mockChatResponse } from '@/lib/ai-mock';
import type { MessageRole } from '@prisma/client';
import type { ChatMessageDTO, ConversationDetailDTO, SendMessageResponse } from '@/types/ai';

export const dynamic = 'force-dynamic';

const SendSchema = z.object({
  conversationId: z.string().nullable().optional(),
  message: z.string().min(1).max(4000),
});

function toMessageDTO(m: { id: string; role: MessageRole; content: string; createdAt: Date }): ChatMessageDTO {
  return { id: m.id, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() };
}

function toConversationDTO(c: {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: { id: string; role: MessageRole; content: string; createdAt: Date }[];
}): ConversationDetailDTO {
  return {
    id: c.id,
    title: c.title,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    messages: c.messages.map(toMessageDTO),
  };
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail('UNAUTHORIZED', 401);
  }

  const json = await req.json().catch(() => null);
  const parsed = SendSchema.safeParse(json);
  if (!parsed.success) return fail('INVALID_INPUT', 400);

  const { conversationId, message } = parsed.data;

  let creditsRemaining: number;
  try {
    creditsRemaining = await consumeCredits(session.organization.id, 1);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return fail('INSUFFICIENT_CREDITS', 402);
    }
    throw err;
  }

  let conversation = conversationId
    ? await prisma.aIConversation.findFirst({
        where: { id: conversationId, organizationId: session.organization.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
    : null;

  if (!conversation) {
    const title = message.slice(0, 60).trim() + (message.length > 60 ? '…' : '');
    conversation = await prisma.aIConversation.create({
      data: {
        organizationId: session.organization.id,
        userId: session.user.id,
        title,
      },
      include: { messages: true },
    });
  }

  await prisma.aIMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'USER',
      content: message,
    },
  });

  const ctx = await loadBusinessContext(session.organization.id);
  const systemPrompt = buildSystemPrompt(ctx, session.locale);

  const priorMessages = await prisma.aIMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
  });

  let assistantText: string;
  let tokensIn: number | undefined;
  let tokensOut: number | undefined;

  if (isAnthropicConfigured()) {
    try {
      const client = getAnthropicClient();
      const response = await client.messages.create({
        model: ANTHROPIC_MODEL,
        temperature: ANTHROPIC_TEMPERATURE,
        max_tokens: 1024,
        system: systemPrompt,
        messages: priorMessages.map((m) => ({
          role: m.role === 'USER' ? 'user' : 'assistant',
          content: m.content,
        })),
      });
      const textBlock = response.content.find((c) => c.type === 'text');
      assistantText = textBlock && textBlock.type === 'text' ? textBlock.text : '';
      tokensIn = response.usage?.input_tokens;
      tokensOut = response.usage?.output_tokens;
    } catch (err) {
      console.error('Anthropic API error:', err);
      assistantText = mockChatResponse(message, ctx, session.locale);
    }
  } else {
    assistantText = mockChatResponse(message, ctx, session.locale);
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

  const response: SendMessageResponse = {
    conversation: toConversationDTO(refreshed),
    creditsRemaining,
  };

  return ok(response);
}
