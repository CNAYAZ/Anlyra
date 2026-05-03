import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import type { InsightPriority, InsightStatus, InsightType } from '@prisma/client';
import type { InsightDTO } from '@/types/ai';

export const dynamic = 'force-dynamic';

const PRIORITY_RANK: Record<InsightPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const TYPES: ReadonlyArray<InsightType> = ['STRATEGY', 'WARNING', 'OPPORTUNITY', 'ACTION'];
const PRIORITIES: ReadonlyArray<InsightPriority> = ['HIGH', 'MEDIUM', 'LOW'];
const STATUSES: ReadonlyArray<InsightStatus> = ['NEW', 'REVIEWED', 'IMPLEMENTED', 'IGNORED'];

function isType(v: string | null): v is InsightType {
  return v !== null && (TYPES as ReadonlyArray<string>).includes(v);
}
function isPriority(v: string | null): v is InsightPriority {
  return v !== null && (PRIORITIES as ReadonlyArray<string>).includes(v);
}
function isStatus(v: string | null): v is InsightStatus {
  return v !== null && (STATUSES as ReadonlyArray<string>).includes(v);
}

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail('UNAUTHORIZED', 401);
  }

  const sp = req.nextUrl.searchParams;
  const typeParam = sp.get('type');
  const priorityParam = sp.get('priority');
  const statusParam = sp.get('status');

  const where = {
    organizationId: session.organization.id,
    ...(isType(typeParam) ? { type: typeParam } : {}),
    ...(isPriority(priorityParam) ? { priority: priorityParam } : {}),
    ...(isStatus(statusParam) ? { status: statusParam } : {}),
  };

  const insights = await prisma.insight.findMany({ where });

  const sorted = insights.sort((a, b) => {
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (p !== 0) return p;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const data: InsightDTO[] = sorted.map((i) => ({
    id: i.id,
    type: i.type,
    priority: i.priority,
    status: i.status,
    title: i.title,
    summary: i.summary,
    content: i.content,
    confidence: i.confidence,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }));

  return ok({ insights: data });
}
