'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { postJson } from '@/lib/fetcher';
import { useToast } from '@/components/ui/toaster';
import { batchSchema, type ImportType } from '@/lib/validators';

type FieldDef = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  width?: string;
};

const FIELDS: Record<ImportType, FieldDef[]> = {
  REVENUE: [
    { key: 'date', type: 'date' },
    { key: 'amount', type: 'number' },
    { key: 'category' },
    { key: 'description' },
  ].map((f) => ({ ...f, label: f.key })) as FieldDef[],
  COST: [
    { key: 'date', type: 'date' },
    { key: 'amount', type: 'number' },
    { key: 'category' },
    { key: 'description' },
  ].map((f) => ({ ...f, label: f.key })) as FieldDef[],
  KPI: [
    { key: 'date', type: 'date' },
    { key: 'name' },
    { key: 'value', type: 'number' },
    { key: 'target', type: 'number' },
    { key: 'unit' },
  ].map((f) => ({ ...f, label: f.key })) as FieldDef[],
  COMPETITOR: [
    { key: 'name' },
    { key: 'website' },
    { key: 'description' },
    { key: 'employees', type: 'number' },
  ].map((f) => ({ ...f, label: f.key })) as FieldDef[],
};

type Row = Record<string, string>;

function emptyRow(type: ImportType): Row {
  const row: Row = {};
  for (const f of FIELDS[type]) row[f.key] = '';
  if (type === 'REVENUE' || type === 'COST') {
    row.date = new Date().toISOString().slice(0, 10);
    row.category = type === 'REVENUE' ? 'sales' : 'other';
  }
  if (type === 'KPI') {
    row.date = new Date().toISOString().slice(0, 10);
    row.unit = '%';
    row.name = 'churn';
  }
  return row;
}

function hydrate(type: ImportType, row: Row) {
  switch (type) {
    case 'REVENUE':
    case 'COST':
      return {
        date: row.date,
        amount: row.amount,
        currency: 'EUR',
        category: row.category,
        description: row.description || null,
        recurring: false,
      };
    case 'KPI':
      return {
        date: row.date,
        name: row.name,
        value: row.value,
        target: row.target || null,
        unit: row.unit,
      };
    case 'COMPETITOR':
      return {
        name: row.name,
        website: row.website || null,
        description: row.description || null,
        employees: row.employees ? Number(row.employees) : null,
        strengths: [],
        weaknesses: [],
      };
  }
}

export function BatchEntry({ type }: { type: ImportType }) {
  const t = useTranslations('manual.batch');
  const tf = useTranslations('import.field');
  const common = useTranslations('common');
  const tToast = useTranslations('manual.toast');
  const { toast } = useToast();

  const [rows, setRows] = React.useState<Row[]>(() => [emptyRow(type), emptyRow(type)]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setRows([emptyRow(type), emptyRow(type)]);
  }, [type]);

  const fields = FIELDS[type];

  const save = async () => {
    setSaving(true);
    try {
      const hydrated = rows
        .filter((r) => Object.values(r).some((v) => v && v.toString().trim()))
        .map((r) => hydrate(type, r));
      const payload = { type, data: hydrated };
      const parsed = batchSchema.safeParse(payload);
      if (!parsed.success) {
        toast({
          title: tToast('error'),
          description: parsed.error.issues[0]?.message,
          variant: 'error',
        });
        setSaving(false);
        return;
      }
      const out = await postJson<{ count: number }>('/api/data/batch', parsed.data);
      toast({
        title: tToast('batchSaved', { count: out.count }),
        variant: 'success',
      });
      setRows([emptyRow(type), emptyRow(type)]);
    } catch (err) {
      toast({
        title: tToast('error'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('rows', { count: rows.length })}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {fields.map((f) => (
              <TableHead key={f.key}>{tf(f.key as Parameters<typeof tf>[0])}</TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {fields.map((f) => (
                <TableCell key={f.key}>
                  <Input
                    type={f.type ?? 'text'}
                    value={row[f.key] ?? ''}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i]!, [f.key]: e.target.value };
                      setRows(next);
                    }}
                  />
                </TableCell>
              ))}
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                  aria-label={t('removeRow')}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setRows([...rows, emptyRow(type)])}
        >
          <Plus className="h-4 w-4" />
          {t('addRow')}
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {t('save')}
        </Button>
      </div>
    </div>
  );
}
