import { ok } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { organizationId } = await getCurrentContext();

  const conversations = await prisma.aIConversation.findMany({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { messages: true } } },
  });

  const data = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt.toISOString(),
    messageCount: c._count.messages,
  }));

  return ok({ conversations: data });
}
