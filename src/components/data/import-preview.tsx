'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, Copy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportTarget } from '@/lib/import-targets';
import { applyMapping, validateRows } from '@/lib/import/validate';

type Props = {
  target: ImportTarget;
  /** ALL parsed rows: validation summary covers the whole file, table shows first 10. */
  rows: Record<string, unknown>[];
  mapping: Record<string, string | null>;
  /**
   * 1-based row numbers that look already present in this organization, as
   * answered by POST /api/data/import/duplicates. The QUERY lives in the page,
   * not here: the page is what builds the commit payload and therefore what
   * has to drop these rows when the customer asks for it. This component only
   * shows them, so no state has to travel upwards.
   */
  suspectedRows: number[];
  suspectedLoading: boolean;
  skipSuspected: boolean;
  onSkipSuspectedChange: (skip: boolean) => void;
};

const MAX_ERRORS_SHOWN = 50;
const MAX_SUSPECTED_SHOWN = 50;

export function ImportPreview({
  target,
  rows,
  mapping,
  suspectedRows,
  suspectedLoading,
  skipSuspected,
  onSkipSuspectedChange,
}: Props) {
  const t = useTranslations('dataImport');

  const { validRows, errors } = useMemo(
    () => validateRows(target, mapping, rows),
    [rows, mapping, target],
  );
  const invalidRowNumbers = useMemo(() => new Set(errors.map((e) => e.row)), [errors]);
  const suspectedSet = useMemo(() => new Set(suspectedRows), [suspectedRows]);

  const previewRows = useMemo(
    () =>
      rows.slice(0, 10).map((row, idx) => {
        const mapped = applyMapping(row, mapping);
        const result = target.schema.safeParse(mapped);
        return {
          mapped,
          valid: !invalidRowNumbers.has(idx + 1),
          data: result.success ? (result.data as Record<string, unknown>) : null,
        };
      }),
    [rows, mapping, target, invalidRowNumbers],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold">{t('previewTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('previewDescription')}</p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 font-num font-semibold uppercase text-muted-foreground">
          {rows.length} {t('previewTotalRows')}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 font-num font-semibold uppercase text-success">
          <Check className="h-3 w-3" /> {validRows.length} {t('previewValidRow')}
        </span>
        {invalidRowNumbers.size > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-1 font-num font-semibold uppercase text-danger">
            <X className="h-3 w-3" /> {invalidRowNumbers.size} {t('previewInvalidRow')}
          </span>
        )}
        {suspectedRows.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 font-num font-semibold uppercase text-warning">
            <Copy className="h-3 w-3" /> {suspectedRows.length} {t('previewSuspectedBadge')}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              {target.fields.map((f) => (
                <th key={f.key} className="px-3 py-2 text-left">
                  {t(f.labelKey as 'fieldName')}
                </th>
              ))}
              <th className="px-3 py-2 text-left">{t('previewStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((r, idx) => (
              <tr
                key={idx}
                className={cn(
                  'border-t border-border',
                  !r.valid && 'bg-danger/5',
                  r.valid && suspectedSet.has(idx + 1) && 'bg-warning/5',
                )}
              >
                <td className="px-3 py-2 font-num text-xs text-muted-foreground">{idx + 1}</td>
                {target.fields.map((f) => {
                  const value = r.data?.[f.key] ?? r.mapped[f.key];
                  return (
                    <td key={f.key} className="px-3 py-2 font-num text-xs">
                      {value === null || value === undefined || value === ''
                        ? '—'
                        : String(value)}
                    </td>
                  );
                })}
                <td className="px-3 py-2">
                  {!r.valid ? (
                    <X className="h-4 w-4 text-danger" />
                  ) : suspectedSet.has(idx + 1) ? (
                    // Valid AND looks already present: the warning icon, with the
                    // reason on hover. Never the error icon — this row is
                    // perfectly importable, it just deserves a second look.
                    <span title={t('previewSuspectedRowTitle')}>
                      <Copy className="h-4 w-4 text-warning" />
                    </span>
                  ) : (
                    <Check className="h-4 w-4 text-success" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errors.length > 0 && (
        <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold">{t('previewErrorsTitle')}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t('previewErrorsDescription')}</p>
          <ul className="space-y-1 text-xs">
            {errors.slice(0, MAX_ERRORS_SHOWN).map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-num shrink-0 font-semibold">
                  {t('previewErrorRow')} {e.row}
                </span>
                {e.field && <span className="shrink-0 text-muted-foreground">[{e.field}]</span>}
                <span>{e.message}</span>
              </li>
            ))}
            {errors.length > MAX_ERRORS_SHOWN && (
              <li className="font-num text-muted-foreground">+{errors.length - MAX_ERRORS_SHOWN}…</li>
            )}
          </ul>
        </div>
      )}

      {/* Rows that look already present. Same visual language as the error
          panel above so it reads as part of the same "before you confirm"
          review, but deliberately NOT an error: the wording says "look already
          present", never "are duplicates", because two genuine payments of the
          same amount on the same day to the same counterparty do exist. */}
      {suspectedRows.length > 0 && (
        <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-4">
          <div className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold">
              {t('previewSuspectedTitle', { count: suspectedRows.length })}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">{t('previewSuspectedDescription')}</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {suspectedRows.slice(0, MAX_SUSPECTED_SHOWN).map((row) => (
              <li key={row} className="font-num font-semibold">
                {t('previewErrorRow')} {row}
              </li>
            ))}
            {suspectedRows.length > MAX_SUSPECTED_SHOWN && (
              <li className="font-num text-muted-foreground">
                +{suspectedRows.length - MAX_SUSPECTED_SHOWN}…
              </li>
            )}
          </ul>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary-accent"
              checked={skipSuspected}
              onChange={(e) => onSkipSuspectedChange(e.target.checked)}
            />
            <span>
              <span className="font-medium">{t('previewSuspectedSkipLabel')}</span>
              <span className="block text-xs text-muted-foreground">
                {skipSuspected
                  ? t('previewSuspectedSkipOn', { count: suspectedRows.length })
                  : t('previewSuspectedSkipOff', { count: suspectedRows.length })}
              </span>
            </span>
          </label>
        </div>
      )}

      {/* While the answer is still in flight the customer is told the check is
          running, so a fast click on "Conferma" is a choice and not a race
          against a panel that had not appeared yet. */}
      {suspectedLoading && (
        <p className="text-xs text-muted-foreground">{t('previewSuspectedChecking')}</p>
      )}
    </div>
  );
}
