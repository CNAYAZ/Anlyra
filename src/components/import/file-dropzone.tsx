'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { FileUp, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCEPTED_EXT, isAcceptedFile } from '@/lib/parsers';

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

export function FileDropzone({ onFile, disabled }: Props) {
  const t = useTranslations('import');
  const [isDragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    const check = isAcceptedFile(file);
    if (!check.ok) {
      setError(check.reason === 'fileTooLarge' ? t('fileTooLarge') : t('unsupportedFormat'));
      return;
    }
    setError(null);
    onFile(file);
  };

  return (
    <div>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          'relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-10 text-center transition-colors',
          isDragging
            ? 'border-primary-accent bg-primary-accent/5'
            : 'border-border bg-white hover:bg-muted/30',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-accent/10 text-primary-accent">
          {isDragging ? (
            <UploadCloud className="h-7 w-7" />
          ) : (
            <FileUp className="h-7 w-7" />
          )}
        </div>
        <div className="space-y-1">
          <div className="font-heading text-lg font-semibold text-primary">
            {isDragging ? t('dropzoneActive') : t('dropzoneTitle')}
          </div>
          <div className="text-sm text-muted-foreground">
            {t('dropzoneOr')}{' '}
            <span className="font-medium text-primary-accent">
              {t('dropzoneBrowse')}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">{t('dropzoneHint')}</div>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_EXT.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
