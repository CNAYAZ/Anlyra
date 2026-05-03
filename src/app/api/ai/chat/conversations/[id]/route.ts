import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import type { ConversationDetailDTO } from '@/types/ai';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail('UNAUTHORIZED', 401);
  }

  const conversation = await prisma.aIConversation.findFirst({
    where: { id: ctx.params.id, organizationId: session.organization.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  if (!conversation) return fail('NOT_FOUND', 404);

  const data: ConversationDetailDTO = {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };

  return ok({ conversation: data });
}
