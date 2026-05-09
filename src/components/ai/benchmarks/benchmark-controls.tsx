'use client';

import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ALL_INDUSTRIES, ALL_SIZES, type IndustryKey, type SizeKey } from '@/lib/benchmarks-data';

const INDUSTRY_LABEL_KEY: Record<IndustryKey, string> = {
  'saas-b2b': 'industrySaasB2b',
  'saas-b2c': 'industrySaasB2c',
  'ecommerce': 'industryEcommerce',
  'marketplace': 'industryMarketplace',
  'fintech': 'industryFintech',
  'agency': 'industryAgency',
};

const SIZE_LABEL_KEY: Record<SizeKey, string> = {
  early: 'sizeEarly',
  growth: 'sizeGrowth',
  scale: 'sizeScale',
};

export type BenchmarkControlValues = {
  industry: IndustryKey;
  size: SizeKey;
};

type Props = {
  values: BenchmarkControlValues;
  onChange: (values: BenchmarkControlValues) => void;
};

export function BenchmarkControls({ values, onChange }: Props) {
  const t = useTranslations('benchmarks');

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1 min-w-[200px]">
        <label className="text-xs font-medium text-muted-foreground">{t('industry')}</label>
        <Select
          value={values.industry}
          onValueChange={(v) => onChange({ ...values, industry: v as IndustryKey })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_INDUSTRIES.map((ind) => (
              <SelectItem key={ind} value={ind}>{t(INDUSTRY_LABEL_KEY[ind])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-xs font-medium text-muted-foreground">{t('size')}</label>
        <Select
          value={values.size}
          onValueChange={(v) => onChange({ ...values, size: v as SizeKey })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_SIZES.map((sz) => (
              <SelectItem key={sz} value={sz}>{t(SIZE_LABEL_KEY[sz])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
