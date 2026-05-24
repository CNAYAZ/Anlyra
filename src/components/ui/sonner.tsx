'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      duration={5000}
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast: [
            'group bg-card border border-border shadow-elev-3 rounded-lg',
            '!border-l-[3px] grid grid-cols-[30px_1fr_auto] gap-3 p-3.5 pl-4 items-start',
          ].join(' '),
          title: 'text-[13px] font-semibold text-foreground tracking-tight',
          description: 'text-[12.5px] text-fg-2 leading-snug mt-1',
          actionButton: 'text-[12px] font-medium text-sage-700 dark:text-sage-300 hover:text-sage-800 hover:underline',
          cancelButton: 'text-[12px] font-medium text-fg-3 hover:underline',
          closeButton: 'text-fg-3 opacity-50 hover:opacity-100 transition-opacity hover:bg-muted',
          success: '!border-l-success-500 [&_[data-icon]]:bg-success-50 [&_[data-icon]]:text-success-700',
          warning: '!border-l-warning-500 [&_[data-icon]]:bg-warning-50 [&_[data-icon]]:text-warning-700',
          error: '!border-l-danger-500 [&_[data-icon]]:bg-danger-50 [&_[data-icon]]:text-danger-700',
          info: '!border-l-info-500 [&_[data-icon]]:bg-info-50 [&_[data-icon]]:text-info-700',
          loading: '!border-l-sage-500 [&_[data-icon]]:bg-sage-50 [&_[data-icon]]:text-sage-700',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
