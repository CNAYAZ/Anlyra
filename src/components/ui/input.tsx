import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-border-strong bg-input-bg px-3.5 text-[13.5px] text-foreground',
        'transition-all duration-150 placeholder:text-fg-3 placeholder:opacity-90',
        'hover:border-sage-500/60',
        'focus:border-sage-500 focus:ring-[3px] focus:ring-sage-500/25 focus:outline-none',
        'disabled:bg-muted disabled:text-fg-3 disabled:cursor-not-allowed',
        'data-[invalid=true]:border-danger-500 data-[invalid=true]:focus:ring-danger-500/20',
        'read-only:bg-muted read-only:border-border',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[88px] w-full rounded-md border border-border-strong bg-input-bg px-3.5 py-2.5 text-[13.5px] text-foreground',
        'transition-all duration-150 placeholder:text-fg-3 placeholder:opacity-90',
        'hover:border-sage-500/60',
        'focus:border-sage-500 focus:ring-[3px] focus:ring-sage-500/25 focus:outline-none',
        'disabled:bg-muted disabled:text-fg-3 disabled:cursor-not-allowed',
        'data-[invalid=true]:border-danger-500 data-[invalid=true]:focus:ring-danger-500/20',
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';
