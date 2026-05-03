'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { BarChart3, FileText } from 'lucide-react';
import type { ReportConfig } from '@/lib/reports/types';
import { buildSamplePayload } from '@/lib/reports/sample-data';
import { formatCurrency } from '@/lib/utils';

export function ReportPreview({ config }: { config: ReportConfig }) {
  const t = useTranslations('reports.builder');
  const tSection = useTranslations('reports.builder.step3');
  const payload = useMemo(() => buildSamplePayload(config), [config]);

  return (
    <div className="card sticky top-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-semibold text-slate-900">
          {t('preview')}
        </h3>
        <span className="badge bg-slate-100 text-slate-600">
          {config.language.toUpperCase()}
        </span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 aspect-[1/1.4] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-br from-primary to-primary-hover text-white p-4">
          <div className="text-[10px] uppercase tracking-wider opacity-80">Pro Analytics</div>
          <div className="font-heading font-bold text-base mt-1 line-clamp-2">
            {config.title || (config.language === 'it' ? 'Report aziendale' : 'Business report')}
          </div>
          <div className="text-[10px] opacity-80 mt-1">{payload.period.label}</div>
        </div>

        <div className="flex-1 p-4 space-y-2.5 overflow-hidden">
          {config.sections.map((section) => (
            <div key={section} className="flex items-start gap-2">
              {config.includeCharts ? (
                <BarChart3 className="h-3 w-3 text-primary-accent shrink-0 mt-0.5" />
              ) : (
                <FileText className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-slate-700">
                  {tSection(section)}
                </div>
                <div className="h-1 w-full bg-slate-200 rounded mt-1" />
                <div className="h-1 w-3/4 bg-slate-200 rounded mt-1" />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 p-3 bg-white">
          <div className="text-[10px] text-slate-500">
            {config.language === 'it' ? 'Ricavi periodo' : 'Period revenue'}
          </div>
          <div className="font-mono text-sm font-semibold text-slate-900">
            {formatCurrency(payload.kpis.revenue, config.language)}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-500 space-y-1">
        <div className="flex justify-between">
          <span>{config.language === 'it' ? 'Sezioni' : 'Sections'}</span>
          <span className="font-medium text-slate-700">{config.sections.length}</span>
        </div>
        <div className="flex justify-between">
          <span>{config.language === 'it' ? 'Grafici' : 'Charts'}</span>
          <span className="font-medium text-slate-700">
            {config.includeCharts
              ? config.language === 'it'
                ? 'Inclusi'
                : 'Included'
              : config.language === 'it'
              ? 'Esclusi'
              : 'Excluded'}
          </span>
        </div>
      </div>
    </div>
  );
}
