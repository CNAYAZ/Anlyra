import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  meta?: string;
  actions?: React.ReactNode;
  density?: 'default' | 'dense';
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  badges,
  meta,
  actions,
  density = 'default',
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-7',
        density === 'default' ? 'px-8 pt-10 pb-8' : 'px-7 pt-5 pb-4 border-b border-border',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className={cn('flex flex-wrap items-center gap-3', density === 'default' ? 'mb-2' : 'mb-1')}>
          <h1
            className={cn(
              'font-semibold text-foreground tracking-tight text-balance break-keep',
              density === 'default'
                ? 'text-[36px] leading-[1.1] tracking-[-0.025em]'
                : 'text-[22px] leading-[1.2] tracking-[-0.015em]',
            )}
          >
            {title}
          </h1>
          {badges}
          {meta && (
            <span className="font-mono text-xs text-fg-3 inline-flex items-center gap-1.5 before:content-['·'] before:opacity-50">
              {meta}
            </span>
          )}
        </div>
        {subtitle && (
          <p
            className={cn(
              'text-fg-2 max-w-prose text-pretty',
              density === 'default' ? 'text-[17px] leading-relaxed' : 'text-[13.5px] leading-snug',
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className={cn('flex items-center shrink-0', density === 'default' ? 'gap-2' : 'gap-1.5')}>
          {actions}
        </div>
      )}
    </div>
  );
}
