'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from './button';

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-danger/20 bg-danger/5 px-6 py-12 text-center">
      <AlertTriangle className="h-10 w-10 text-danger" />
      <h3 className="mt-3 font-heading text-base font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {onRetry ? (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          {retryLabel ?? 'Retry'}
        </Button>
      ) : null}
    </div>
  );
}
