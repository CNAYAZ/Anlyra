'use client';

import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type HistoryFilters = {
  source: string;
  status: string;
  from: string;
  to: string;
};

type Props = {
  filters: HistoryFilters;
  onChange: (filters: HistoryFilters) => void;
};

const ALL = 'all';

export function HistoryFilters({ filters, onChange }: Props) {
  const t = useTranslations('dataHistory');

  function set(key: keyof HistoryFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-col gap-1 min-w-[150px]">
        <Label className="text-xs">{t('filterSource')}</Label>
        <Select value={filters.source} onValueChange={(v) => set('source', v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterAll')}</SelectItem>
            <SelectItem value="file">{t('sourceFile')}</SelectItem>
            <SelectItem value="manual">{t('sourceManual')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 min-w-[180px]">
        <Label className="text-xs">{t('filterStatus')}</Label>
        <Select value={filters.status} onValueChange={(v) => set('status', v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterAll')}</SelectItem>
            <SelectItem value="COMPLETED">{t('statusCompleted')}</SelectItem>
            <SelectItem value="COMPLETED_WITH_ERRORS">{t('statusCompletedWithErrors')}</SelectItem>
            <SelectItem value="PROCESSING">{t('statusProcessing')}</SelectItem>
            <SelectItem value="FAILED">{t('statusFailed')}</SelectItem>
            <SelectItem value="ROLLED_BACK">{t('statusRolledBack')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="hist-from" className="text-xs">{t('filterFrom')}</Label>
        <Input
          id="hist-from"
          type="date"
          className="h-9 w-[160px] text-sm"
          value={filters.from}
          onChange={(e) => set('from', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="hist-to" className="text-xs">{t('filterTo')}</Label>
        <Input
          id="hist-to"
          type="date"
          className="h-9 w-[160px] text-sm"
          value={filters.to}
          onChange={(e) => set('to', e.target.value)}
        />
      </div>
    </div>
  );
}
