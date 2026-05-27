'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary:
          'bg-sage-500 text-white hover:bg-sage-600 active:bg-sage-700 ' +
          'dark:bg-sage-400 dark:text-[hsl(30_6%_10%)] dark:hover:bg-sage-300',
        secondary:
          'bg-card text-sage-700 border border-border-strong ' +
          'hover:bg-muted hover:border-sage-500 dark:text-sage-300',
        ghost:
          'text-sage-700 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-sage-700/30',
        destructive:
          'bg-danger-500 text-white hover:bg-danger-700',
        danger:
          'bg-danger-500 text-white hover:bg-danger-700',
        link:
          'text-sage-700 underline-offset-4 hover:underline h-auto px-0 dark:text-sage-300',
        accent:
          'bg-sage-400 text-white hover:bg-sage-500',
      },
      size: {
        sm:   'h-8 px-3 text-xs gap-1.5',
        md:   'h-9 px-3.5',
        lg:   'h-11 px-5 text-[15px] gap-2',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingMode?: 'replace' | 'inline';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      loadingMode = 'replace',
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    // Slot (asChild) requires exactly one React element child — never pass
    // boolean short-circuit expressions alongside children.
    const content = asChild
      ? children
      : loading && loadingMode === 'replace'
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : (
          <>
            {loading && loadingMode === 'inline' && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            {children}
          </>
        );

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={props.disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
