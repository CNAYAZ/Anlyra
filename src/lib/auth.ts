// Minimal auth scaffolding placeholder.
// In Block 4 the full NextAuth.js v5 setup (Google, Microsoft, Email)
// is wired here with PrismaAdapter. For Block 5 we expose a server-side
// `getCurrentOrgId` that resolves the active organization for the
// signed-in user. The demo seed creates a single org "demo-co" which
// is used as fallback so the market dashboard renders out of the box.

import { prisma } from "@/lib/prisma";

export async function getCurrentOrgId(): Promise<string> {
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!org) {
    throw new Error("No organization found. Run `npm run db:seed`.");
  }
  return org.id;
}
