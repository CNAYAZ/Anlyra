import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import type { ConversationListItemDTO } from '@/types/ai';

export const dynamic = 'force-dynamic';

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail('UNAUTHORIZED', 401);
  }

  const conversations = await prisma.aIConversation.findMany({
    where: { organizationId: session.organization.id },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { messages: true } } },
  });

  const data: ConversationListItemDTO[] = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt.toISOString(),
    messageCount: c._count.messages,
  }));

  return ok({ conversations: data });
}
