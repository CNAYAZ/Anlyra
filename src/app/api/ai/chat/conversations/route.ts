import { ok, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext, isDemoOrganization } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  // getCurrentContext() throws for an anonymous caller (NotAuthenticatedError)
  // — was uncaught here, so Next.js's own default error handling answered
  // instead of a proper 401. Wrapped like every other route that calls it.
  try {
    const { organizationId } = await getCurrentContext();

    // The demo chat saves nothing (see demoChat in ../route.ts) and a demo
    // visitor must never see a saved conversation, whoever's it was.
    if (isDemoOrganization(organizationId)) return ok({ conversations: [] });

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
