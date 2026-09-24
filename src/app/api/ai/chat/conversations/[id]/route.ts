import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  // getCurrentContext() throws for an anonymous caller — was uncaught here,
  // same defect as the list route next to this file.
  try {
    const { organizationId } = await getCurrentContext();

    const conversation = await prisma.aIConversation.findFirst({
      where: { id: (await ctx.params).id, organizationId },
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
  } catch (e) {
    return failFromError(e);
  }
}
