import { prisma } from './prisma';

export class InsufficientCreditsError extends Error {
  constructor() {
    super('INSUFFICIENT_CREDITS');
    this.name = 'InsufficientCreditsError';
  }
}

export async function consumeCredits(organizationId: string, amount: number): Promise<number> {
  const result = await prisma.organization.updateMany({
    where: { id: organizationId, aiCredits: { gte: amount } },
    data: { aiCredits: { decrement: amount } },
  });
  if (result.count === 0) {
    throw new InsufficientCreditsError();
  }
  const updated = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { aiCredits: true },
  });
  return updated.aiCredits;
}

export async function getCredits(organizationId: string): Promise<number> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { aiCredits: true },
  });
  return org.aiCredits;
}

/**
 * Credits back a previously-consumed amount. For the one case where the AI call
 * itself was made (and billed to us by Anthropic) but produced nothing usable —
 * a malformed response we refuse to persist — so the org should not also be
 * billed in credits for a result it never received.
 *
 * NOT a general-purpose "undo": deliberately does not touch InsufficientCreditsError
 * paths (nothing was consumed there) or plain model/network failures (matches the
 * existing behaviour of chat/analyze, which never refund either — the Anthropic
 * call happened either way).
 *
 * Double-refund safety: this is a single atomic increment, not a toggle or a
 * balance recomputation, so calling it is only safe to do EXACTLY ONCE per
 * consumeCredits() call it is meant to undo. Callers must not retry or call it
 * from more than one code path for the same failed request — today only
 * /api/ai/insights/generate does, and only once, in the single catch branch for
 * a malformed AI response.
 */
export async function refundCredits(organizationId: string, amount: number): Promise<number> {
  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { aiCredits: { increment: amount } },
  });
  return updated.aiCredits;
}
