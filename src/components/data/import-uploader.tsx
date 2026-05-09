'use client';

import { useRef, useState, type DragEvent } from 'react';
import { useTranslations } from 'next-intl';
import { UploadCloud, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = ['.csv', '.tsv', '.txt', '.xlsx', '.xls', '.xlsm'];

type Props = {
  onFileAccepted: (file: File) => void;
  pending?: boolean;
  error?: string | null;
};

export function ImportUploader({ onFileAccepted, pending, error }: Props) {
  const t = useTranslations('dataImport');
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (file.size > MAX_SIZE) return t('uploadTooLarge');
    const ext = '.' + (file.name.toLowerCase().split('.').pop() ?? '');
    if (!ACCEPTED.includes(ext)) return t('uploadInvalidFormat');
    return null;
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const err = validate(file);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    onFileAccepted(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  const errorMessage = error ?? localError;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card p-10 text-center transition-colors',
          dragOver && 'border-primary-accent bg-primary-accent/5',
          pending && 'pointer-events-none opacity-60',
        )}
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-accent/10 text-primary-accent">
          <UploadCloud className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">{t('uploadDropHere')}</p>
          <p className="text-xs text-muted-foreground">{t('uploadOrClick')}</p>
        </div>
        <p className="text-[11px] text-muted-foreground">{t('uploadSupported')}</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {pending && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
          <FileText className="h-4 w-4 text-primary-accent" />
          <span>{t('uploadParsing')}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
