'use client';

import { useTranslations } from 'next-intl';

export function CategoryFilter({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (v: string) => void;
  categories: string[];
}) {
  const t = useTranslations('common');
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground"
    >
      <option value="">{t('all')}</option>
      {categories.map((c) => (
        <option key={c} value={c} className="capitalize">
          {c.replace(/_/g, ' ')}
        </option>
      ))}
    </select>
  );
}
