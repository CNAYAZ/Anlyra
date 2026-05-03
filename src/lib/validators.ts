import { z } from 'zod';

const decimalLike = z.union([z.number(), z.string()]).transform((v, ctx) => {
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalidAmount' });
    return z.NEVER;
  }
  return n;
});

const positiveDecimal = decimalLike.refine((n) => n >= 0, 'positive');

const dateLike = z.union([z.string(), z.date()]).transform((v, ctx) => {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalidDate' });
    return z.NEVER;
  }
  return d;
});

export const revenueSchema = z.object({
  date: dateLike,
  amount: positiveDecimal,
  currency: z.string().min(1).max(8).default('EUR'),
  category: z.string().min(1).max(64),
  description: z.string().max(500).optional().nullable(),
  recurring: z.boolean().default(false),
});
export type RevenueInput = z.infer<typeof revenueSchema>;

export const costSchema = z.object({
  date: dateLike,
  amount: positiveDecimal,
  currency: z.string().min(1).max(8).default('EUR'),
  category: z.string().min(1).max(64),
  description: z.string().max(500).optional().nullable(),
  recurring: z.boolean().default(false),
});
export type CostInput = z.infer<typeof costSchema>;

export const kpiSchema = z.object({
  date: dateLike,
  name: z.string().min(1).max(64),
  value: decimalLike,
  target: decimalLike.optional().nullable(),
  unit: z.string().min(1).max(16),
});
export type KpiInput = z.infer<typeof kpiSchema>;

export const competitorSchema = z.object({
  name: z.string().min(1).max(120),
  website: z.string().url().max(300).optional().nullable().or(z.literal('')),
  description: z.string().max(1000).optional().nullable(),
  estimatedRevenue: decimalLike.optional().nullable(),
  employees: z.number().int().nonnegative().optional().nullable(),
  marketShare: decimalLike.optional().nullable(),
  strengths: z.array(z.string().min(1).max(80)).default([]),
  weaknesses: z.array(z.string().min(1).max(80)).default([]),
});
export type CompetitorInput = z.infer<typeof competitorSchema>;

export const importTypeSchema = z.enum(['REVENUE', 'COST', 'KPI', 'COMPETITOR']);
export type ImportType = z.infer<typeof importTypeSchema>;

export const manualSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('REVENUE'), data: revenueSchema }),
  z.object({ type: z.literal('COST'), data: costSchema }),
  z.object({ type: z.literal('KPI'), data: kpiSchema }),
  z.object({ type: z.literal('COMPETITOR'), data: competitorSchema }),
]);

export const batchSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('REVENUE'), data: z.array(revenueSchema).min(1).max(500) }),
  z.object({ type: z.literal('COST'), data: z.array(costSchema).min(1).max(500) }),
  z.object({ type: z.literal('KPI'), data: z.array(kpiSchema).min(1).max(500) }),
  z.object({ type: z.literal('COMPETITOR'), data: z.array(competitorSchema).min(1).max(500) }),
]);

export const importRequestSchema = z.object({
  type: importTypeSchema,
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().nonnegative(),
  rows: z.array(z.record(z.string(), z.string())).min(1).max(10000),
  mapping: z.record(z.string(), z.string()),
});
export type ImportRequest = z.infer<typeof importRequestSchema>;
