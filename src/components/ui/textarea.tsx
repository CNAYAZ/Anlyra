import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[60px] w-full rounded-md border border-border-strong bg-input-bg px-3 py-2 text-[13.5px] text-foreground',
        'transition-colors placeholder:text-fg-3',
        'hover:border-sage-500/50',
        'focus:border-sage-500 focus:ring-[3px] focus:ring-sage-500/20 focus:outline-none',
        'disabled:bg-muted disabled:text-fg-3 disabled:cursor-not-allowed',
        'data-[invalid=true]:border-danger-500 data-[invalid=true]:focus:ring-danger-500/20',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
