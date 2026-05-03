import { z } from 'zod';

export const INDUSTRIES = [
  'saas',
  'ecommerce',
  'services',
  'retail',
  'manufacturing',
  'finance',
  'healthcare',
  'education',
  'realestate',
  'hospitality',
  'logistics',
  'other'
] as const;

export const SIZES = ['solo', 'small', 'medium', 'large', 'enterprise'] as const;
export const TEMPLATES = ['saas', 'ecommerce', 'services'] as const;
export const IMPORT_MODES = ['upload', 'connect', 'manual', 'skip'] as const;

export const INDUSTRY_ICON: Record<(typeof INDUSTRIES)[number], string> = {
  saas: '☁️',
  ecommerce: '🛒',
  services: '🤝',
  retail: '🏬',
  manufacturing: '🏭',
  finance: '💼',
  healthcare: '🩺',
  education: '🎓',
  realestate: '🏠',
  hospitality: '🍽️',
  logistics: '🚚',
  other: '✨'
};

export const companySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  industry: z.enum(INDUSTRIES),
  size: z.enum(SIZES),
  country: z.string().min(2, 'Country is required'),
  currency: z.string().min(3).max(3),
  website: z.string().url().or(z.literal('')).optional(),
  logoUrl: z.string().url().or(z.literal('')).optional()
});

export type CompanyValues = z.infer<typeof companySchema>;

export const onboardingPayloadSchema = z.object({
  company: companySchema,
  importMode: z.enum(IMPORT_MODES),
  template: z.enum(TEMPLATES)
});

export type OnboardingPayload = z.infer<typeof onboardingPayloadSchema>;
