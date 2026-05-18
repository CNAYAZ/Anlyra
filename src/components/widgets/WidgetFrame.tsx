'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Settings2, X, GripVertical } from 'lucide-react';

interface WidgetFrameProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  onConfigure?: () => void;
  onRemove?: () => void;
  isEditable?: boolean;
  className?: string;
}

export function WidgetFrame({
  title,
  subtitle,
  children,
  onConfigure,
  onRemove,
  isEditable,
  className,
}: WidgetFrameProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-card',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {isEditable && (
            <span className="drag-handle flex cursor-grab items-center text-muted-foreground active:cursor-grabbing">
              <GripVertical className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            {title && <p className="truncate font-heading text-sm font-semibold text-bg-dark">{title}</p>}
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {isEditable && (
          <div className="flex shrink-0 items-center gap-1">
            {onConfigure && (
              <button
                type="button"
                onClick={onConfigure}
                onMouseDown={(e) => e.stopPropagation()}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Configure"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                onMouseDown={(e) => e.stopPropagation()}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="relative flex-1 overflow-hidden p-3">{children}</div>
    </div>
  );
}
