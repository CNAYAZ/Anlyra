'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type OnChangeFn,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Column meta type extension ── */
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'right' | 'center';
    tabular?: boolean;
  }
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  state?: 'idle' | 'loading' | 'empty';
  emptyMessage?: { title: string; sub?: string };
  onRowClick?: (row: T) => void;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  className?: string;
}

function SortIndicator({ dir }: { dir: false | 'asc' | 'desc' }) {
  if (dir === 'asc') return <ChevronUp className="inline-block h-3 w-3 ml-1 text-sage-600" aria-hidden />;
  if (dir === 'desc') return <ChevronDown className="inline-block h-3 w-3 ml-1 text-sage-600" aria-hidden />;
  return <ChevronsUpDown className="inline-block h-3 w-3 ml-1 text-fg-3 opacity-50" aria-hidden />;
}

function SkeletonRows({ columns, count }: { columns: number; count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="even:bg-muted/40">
          {Array.from({ length: columns }).map((__, j) => (
            <td key={j} className="px-3.5 py-2.5 border-b border-border">
              <Skeleton className="h-4 w-full max-w-[140px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DataTable<T>({
  columns,
  data,
  state = 'idle',
  emptyMessage,
  onRowClick,
  toolbar,
  footer,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  className,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      ...(sorting !== undefined && { sorting }),
      ...(rowSelection !== undefined && { rowSelection }),
    },
    onSortingChange,
    onRowSelectionChange,
    enableRowSelection: rowSelection !== undefined,
  });

  return (
    <div
      className={cn('bg-card border border-border rounded-lg overflow-hidden', className)}
      aria-busy={state === 'loading' || undefined}
    >
      {toolbar && (
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
          {toolbar}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]" role="grid">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta;
                  const sort = h.column.getIsSorted();
                  const canSort = h.column.getCanSort();
                  return (
                    <th
                      key={h.id}
                      colSpan={h.colSpan}
                      aria-sort={
                        sort === 'asc'
                          ? 'ascending'
                          : sort === 'desc'
                          ? 'descending'
                          : canSort
                          ? 'none'
                          : undefined
                      }
                      className={cn(
                        'sticky top-0 bg-bg text-[10.5px] font-semibold uppercase tracking-wider',
                        'text-fg-3 px-3.5 py-2.5 border-b border-border whitespace-nowrap',
                        meta?.align === 'right' && 'text-right',
                        meta?.align === 'center' && 'text-center',
                        !meta?.align && 'text-left',
                        canSort && 'cursor-pointer select-none hover:text-foreground',
                      )}
                      onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                      {canSort && <SortIndicator dir={sort} />}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {state === 'loading' ? (
              <SkeletonRows columns={columns.length} count={5} />
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12 text-fg-2"
                >
                  <p className="text-[14px] font-medium">
                    {emptyMessage?.title ?? 'Nessun risultato'}
                  </p>
                  {emptyMessage?.sub && (
                    <p className="text-[12px] text-fg-3 mt-1">{emptyMessage.sub}</p>
                  )}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    'even:bg-muted/40 hover:bg-muted/70 transition-colors',
                    'data-[state=selected]:bg-sage-50 dark:data-[state=selected]:bg-sage-700/20',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta;
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          'px-3.5 py-2.5 border-b border-border last:border-b-0 whitespace-nowrap',
                          meta?.align === 'right' && 'text-right',
                          meta?.align === 'center' && 'text-center',
                          meta?.tabular &&
                            "tabular-nums [font-feature-settings:'tnum'_1] tracking-[-0.005em]",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3 text-[12.5px] text-fg-3">
          {footer}
        </div>
      )}
    </div>
  );
}
