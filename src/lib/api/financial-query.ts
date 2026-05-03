import { z } from 'zod';
import { getDemoDataset, type DemoDataset } from '@/lib/demo/data';
import { requireSession } from '@/lib/auth/session';

export const periodSchema = z.enum(['1m', '3m', '6m', '12m', 'custom']);
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const financialQuerySchema = z.object({
  period: periodSchema.default('12m'),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const listQuerySchema = financialQuerySchema.extend({
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['date', 'amount', 'category']).default('date'),
  sortOrder: sortOrderSchema,
});

export type FinancialQuery = z.infer<typeof financialQuerySchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;

export function getOrgData(): DemoDataset {
  requireSession();
  return getDemoDataset();
}
