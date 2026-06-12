import { prisma } from '@/lib/prisma';

/**
 * DEROGA DOCUMENTATA al vincolo "mai modelli zombie in query nuove".
 *
 * La tabella ImportBatch ha FK fisiche verso User_b4(id) e Organization_b4(id)
 * (verificato in tutte e 3 le migration che la ricreano). Gli utenti reali
 * vivono però in User/Organization: senza una riga-ombra nelle tabelle _b4,
 * QUALSIASI prisma.importBatch.create() fallisce a runtime con FK violation.
 * Rimuovere le FK richiederebbe una migration su prisma/schema.prisma, vietata
 * in questa sessione. Questo helper è l'unico punto del codice nuovo che tocca
 * i modelli zombie, è idempotente e va eliminato quando una migration sgancerà
 * ImportBatch dai modelli _b4 (tracciato nel decision log della sessione).
 */
export async function ensureImportBatchFkRows(userId: string, organizationId: string) {
  const [user, org] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
  ]);

  // Email sintetica deterministica: evita collisioni con lo unique(email) di
  // User_b4 qualora esista già una riga legacy con la stessa email reale.
  const shadowEmail = `fk-shadow+${userId}@anlyra.invalid`;

  await prisma.user_b4.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: shadowEmail, name: user?.name ?? null },
  });
  await prisma.organization_b4.upsert({
    where: { id: organizationId },
    update: {},
    create: { id: organizationId, name: org?.name ?? organizationId },
  });
}
