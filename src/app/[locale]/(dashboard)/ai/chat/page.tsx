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
        <div className="border-b border-amber-300 bg-amber-50 px-6 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {MISSING_KEY_MESSAGE}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ChatClient companyName={org.name} initialCredits={org.aiCredits} />
      </div>
    </div>
  );
}
