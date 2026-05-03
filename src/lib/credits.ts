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
