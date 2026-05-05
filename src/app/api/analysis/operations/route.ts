import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';
import { evaluateStatus } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { organizationId } = await getCurrentContext();
    const kpiRows = await prisma.kPI.findMany({ where: { organizationId } });
    const records = await prisma.financialRecord.findMany({ where: { organizationId, type: 'REVENUE' } });
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });

    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    const recentRevenue = records.filter((r) => r.occurredAt >= since).reduce((s, r) => s + r.amount, 0);
    const revPerEmp = org.employees > 0 ? Math.round(recentRevenue / org.employees) : 0;

    const find = (name: string) => kpiRows.find((k) => k.name.toLowerCase().includes(name.toLowerCase()));

    const churn = find('churn')?.value ?? 4.2;
    const conversion = find('conversion')?.value ?? 2.8;
    const nps = find('nps')?.value ?? 42;
    const retention = Math.max(0, +(100 - churn).toFixed(1));

    const kpis = [
      {
        key: 'churnRate',
        value: churn,
        delta: -0.6,
        target: find('churn')?.target ?? 5,
        unit: 'percent' as const,
        status: evaluateStatus(churn, { good: 3, warn: 5, invert: true }),
      },
      {
        key: 'retention',
        value: retention,
        delta: 1.4,
        target: 90,
        unit: 'percent' as const,
        status: evaluateStatus(retention, { good: 90, warn: 80 }),
      },
      {
        key: 'nps',
        value: nps,
        delta: 5,
        target: find('nps')?.target ?? 40,
        unit: 'score' as const,
        status: evaluateStatus(nps, { good: 40, warn: 20 }),
      },
      {
        key: 'conversionRate',
        value: conversion,
        delta: 0.4,
        target: find('conversion')?.target ?? 4,
        unit: 'percent' as const,
        status: evaluateStatus(conversion, { good: 4, warn: 2.5 }),
      },
      {
        key: 'revenuePerEmployee',
        value: revPerEmp,
        delta: 8.2,
        target: 130_000,
        unit: 'currency' as const,
        status: evaluateStatus(revPerEmp, { good: 130_000, warn: 100_000 }),
      },
    ];

    return ok({
      kpis,
      gauges: [
        { key: 'churnRate', value: churn, min: 0, max: 10, invert: true, warnAt: 0.3, goodAt: 0.5,
          status: evaluateStatus(churn, { good: 3, warn: 5, invert: true }), unit: 'percent' as const },
        { key: 'retention', value: retention, min: 0, max: 100, warnAt: 0.8, goodAt: 0.9,
          status: evaluateStatus(retention, { good: 90, warn: 80 }), unit: 'percent' as const },
        { key: 'nps', value: nps, min: -100, max: 100, warnAt: 0.6, goodAt: 0.7,
          status: evaluateStatus(nps, { good: 40, warn: 20 }), unit: 'score' as const },
      ],
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
