'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

/* ─── TabsList ─── */

const tabsListVariants = cva('', {
  variants: {
    variant: {
      underline: 'flex gap-5 border-b border-border',
      pill:      'inline-flex gap-1 p-1 bg-muted rounded-md',
      vertical:  'flex flex-col gap-0.5 border-r border-border pr-2',
    },
  },
  defaultVariants: { variant: 'pill' },
});

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant }), className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

/* ─── TabsTrigger ─── */

const tabsTriggerVariants = cva(
  'inline-flex items-center gap-1.5 font-medium text-fg-2 transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-1 ' +
  'disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        underline:
          'py-2.5 border-b-2 border-transparent -mb-px text-[13.5px] ' +
          'hover:text-foreground ' +
          'data-[state=active]:text-sage-700 data-[state=active]:border-sage-500 ' +
          'dark:data-[state=active]:text-sage-300 dark:data-[state=active]:border-sage-300',
        pill:
          'whitespace-nowrap rounded-md px-3 py-1.5 text-sm ' +
          'data-[state=active]:bg-card data-[state=active]:text-sage-700 data-[state=active]:shadow-sm ' +
          'dark:data-[state=active]:text-sage-300',
        vertical:
          'px-2.5 py-2 rounded-sm text-[13px] text-left w-full ' +
          'hover:bg-muted ' +
          'data-[state=active]:bg-sage-50 data-[state=active]:text-sage-700 ' +
          'dark:data-[state=active]:bg-sage-700/30 dark:data-[state=active]:text-sage-300',
      },
    },
    defaultVariants: { variant: 'pill' },
  }
);

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {
  badge?: number;
}

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, badge, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  >
    {children}
    {badge !== undefined && badge > 0 && (
      <span className="ml-1 rounded-full bg-muted px-1.5 py-px text-[10.5px] font-medium tabular-nums leading-tight">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

/* ─── TabsContent ─── */

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
