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
      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200"
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
