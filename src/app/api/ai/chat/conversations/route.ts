import { ok, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  // getCurrentContext() throws for an anonymous caller (NotAuthenticatedError)
  // — was uncaught here, so Next.js's own default error handling answered
  // instead of a proper 401. Wrapped like every other route that calls it.
  try {
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
  } catch (e) {
    return failFromError(e);
  }
}
