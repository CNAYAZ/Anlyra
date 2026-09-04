import { ChatClient } from '@/app/[locale]/ai/chat/chat-client';
import { getCurrentContext } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getCreditBalance } from '@/lib/billing/repository';
import { isAnthropicConfigured, MISSING_KEY_MESSAGE } from '@/lib/ai/client';

export const dynamic = 'force-dynamic';

export default async function AIChatPage() {
  const { organizationId } = await getCurrentContext();
  // The balance comes from getCreditBalance, the SAME read the dashboard layout
  // and the alerts page use, so all three agree. It returns plan + purchased
  // credits; this page used to select Organization.aiCredits by hand, which
  // after the plan/purchased split would have shown only the plan half — a
  // customer who bought a pack would have seen the counter not move.
  const [org, credits] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true },
    }),
    getCreditBalance(organizationId),
  ]);

  const configured = isAnthropicConfigured();

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {!configured && (
        <div className="border-b border-warning/30 bg-warning/10 px-6 py-3 text-sm text-foreground">
          {MISSING_KEY_MESSAGE}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ChatClient companyName={org.name} initialCredits={credits} />
      </div>
    </div>
  );
}
