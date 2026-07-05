import { ok, fail } from '@/lib/api';
import { isAnthropicConfigured, MISSING_KEY_MESSAGE } from '@/lib/ai/client';
import { getAuthContext } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST() {
  // No-op stub: insight generation requires Anthropic credits and is
  // intentionally disabled in demo mode. We just check current state and
  // surface a clear message to the UI without consuming any credits.
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { aiCredits: true },
    });
    if (org.aiCredits < 3) {
      return fail('INSUFFICIENT_CREDITS', 402);
    }
    if (!isAnthropicConfigured()) {
      return fail(MISSING_KEY_MESSAGE, 503);
    }
    // Even when configured, we keep the demo behaviour disabled until the
    // user explicitly enables AI generation. Surface a friendly message.
    return fail('AI_DISABLED_IN_DEMO', 503);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
