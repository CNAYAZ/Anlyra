import { ChatClient } from '@/app/[locale]/ai/chat/chat-client';
import { getCurrentContext } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { isAnthropicConfigured, MISSING_KEY_MESSAGE } from '@/lib/ai/client';

export const dynamic = 'force-dynamic';

export default async function AIChatPage() {
  const { organizationId } = await getCurrentContext();
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true, aiCredits: true },
  });

  const configured = isAnthropicConfigured();

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {!configured && (
        <div className="border-b border-warning/30 bg-warning/10 px-6 py-3 text-sm text-foreground">
          {MISSING_KEY_MESSAGE}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ChatClient companyName={org.name} initialCredits={org.aiCredits} />
      </div>
    </div>
  );
}
