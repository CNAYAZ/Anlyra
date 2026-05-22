'use client';

import * as React from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  success?: string;
  className?: string;
  children: React.ReactElement;
}

export function Field({
  id,
  label,
  required,
  help,
  error,
  success,
  className,
  children,
}: FieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  const errId = error ? `${id}-err` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground tracking-tight"
      >
        {label}
        {required && (
          <span aria-hidden className="text-danger-500 font-semibold">
            *
          </span>
        )}
      </label>

      {React.cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
        'aria-describedby':
          [errId, helpId].filter(Boolean).join(' ') || undefined,
        'data-invalid': error ? 'true' : undefined,
      } as React.HTMLAttributes<HTMLElement>)}

      {error ? (
        <p
          id={errId}
          role="alert"
          className="text-[11.5px] text-danger-700 flex items-center gap-1.5"
        >
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      ) : success ? (
        <p className="text-[11.5px] text-success-700 flex items-center gap-1.5">
          <Check className="h-3 w-3 shrink-0" />
          {success}
        </p>
      ) : (
        help && (
          <p id={helpId} className="text-[11.5px] text-fg-3 leading-snug">
            {help}
          </p>
        )
      )}
    </div>
  );
}
