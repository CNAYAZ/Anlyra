import { z } from 'zod';

export const reportTypeSchema = z.enum([
  'complete',
  'executive',
  'finance',
  'market',
  'operations',
  'custom',
]);
export type ReportType = z.infer<typeof reportTypeSchema>;

export const reportSectionSchema = z.enum([
  'executive',
  'finance',
  'cashflow',
  'market',
  'operations',
  'projections',
  'benchmark',
  'recommendations',
]);
export type ReportSection = z.infer<typeof reportSectionSchema>;

export const reportPeriodSchema = z.enum(['1m', '3m', '6m', '12m', 'custom']);
export type ReportPeriod = z.infer<typeof reportPeriodSchema>;

export const reportLanguageSchema = z.enum(['it', 'en']);
export type ReportLanguage = z.infer<typeof reportLanguageSchema>;

export const reportConfigSchema = z
  .object({
    type: reportTypeSchema,
    period: reportPeriodSchema,
    customPeriodFrom: z.string().optional(),
    customPeriodTo: z.string().optional(),
    sections: z.array(reportSectionSchema).min(1),
    language: reportLanguageSchema,
    includeCharts: z.boolean(),
    title: z.string().min(1).max(120),
  })
  .refine(
    (data) =>
      data.period !== 'custom' ||
      (!!data.customPeriodFrom && !!data.customPeriodTo),
    { message: 'Custom period requires from/to dates', path: ['customPeriodFrom'] }
  );

export type ReportConfig = z.infer<typeof reportConfigSchema>;

export const REPORT_TYPE_SECTIONS: Record<ReportType, ReportSection[]> = {
  complete: [
    'executive',
    'finance',
    'cashflow',
    'market',
    'operations',
    'projections',
    'benchmark',
    'recommendations',
  ],
  executive: ['executive', 'recommendations'],
  finance: ['finance', 'cashflow', 'projections'],
  market: ['market', 'benchmark'],
  operations: ['operations'],
  custom: ['executive'],
};

export interface GeneratedReport {
  id: string;
  title: string;
  type: ReportType;
  createdAt: string;
  status: 'ready' | 'generating' | 'failed';
  sizeBytes: number;
  shareEnabled: boolean;
  shareToken?: string;
  config: ReportConfig;
}

export interface ScheduledReport {
  id: string;
  name: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  active: boolean;
  config: ReportConfig;
  createdAt: string;
}
