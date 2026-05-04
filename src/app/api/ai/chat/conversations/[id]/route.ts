import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const { organizationId } = await getCurrentContext();

  const conversation = await prisma.aIConversation.findFirst({
    where: { id: ctx.params.id, organizationId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  if (!conversation) return fail('NOT_FOUND', 404);

  return ok({
    conversation: {
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
    },
  });
}
