import { NextRequest } from 'next/server';
import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';
import { parseStoredAnalysis } from '@/lib/alerts/ai-analysis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getCurrentContext();
    const sp = req.nextUrl.searchParams;
    const where: Record<string, unknown> = { organizationId };
    const severity = sp.get('severity');
    const status = sp.get('status');
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const rows = await prisma.alert.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const newCount = await prisma.alert.count({
      where: { organizationId, status: 'NEW' },
    });

    return ok({
      alerts: rows.map((a) => ({
        id: a.id,
        severity: a.severity,
        status: a.status,
        title: a.title,
        description: a.description,
        source: a.source,
        recommendation: a.recommendation,
        aiAnalysis: parseStoredAnalysis(a.aiAnalysis),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      newCount,
    });
  } catch (e) {
    return failFromError(e);
  }
}
