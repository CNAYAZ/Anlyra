'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from 'next-intl';

export function DataPreview({
  headers,
  rows,
  totalRows,
}: {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}) {
  const t = useTranslations('import');
  const shown = rows.slice(0, 10);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-heading text-base font-semibold text-primary">
            {t('preview')}
          </div>
          <div className="text-xs text-muted-foreground">{t('previewHint')}</div>
        </div>
        <div className="text-xs text-muted-foreground num">
          {shown.length} / {totalRows}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((row, i) => (
            <TableRow key={i}>
              {headers.map((h) => (
                <TableCell key={h} className="whitespace-nowrap">
                  {row[h] ?? ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
