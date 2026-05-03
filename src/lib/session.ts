// Stub session helper used until Block 3 auth lands.
// Returns the demo user/org for dev so Block 4 features work end-to-end.
import { prisma } from './prisma';

export async function getCurrentContext() {
  let user = await prisma.user.findFirst({ where: { email: 'demo@pro.app' } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: 'demo@pro.app', name: 'Demo User' },
    });
  }

  let membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });
  if (!membership) {
    const org = await prisma.organization.create({
      data: { name: 'Demo Org' },
    });
    membership = await prisma.organizationMember.create({
      data: { userId: user.id, organizationId: org.id, role: 'owner' },
      include: { organization: true },
    });
  }

  return { userId: user.id, organizationId: membership.organizationId };
}
