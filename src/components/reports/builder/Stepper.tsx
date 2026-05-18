'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Stepper({
  steps,
  current,
}: {
  steps: { label: string }[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, idx) => {
        const status =
          idx < current ? 'done' : idx === current ? 'active' : 'pending';
        return (
          <li key={idx} className="flex items-center gap-2">
            <div
              className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors',
                status === 'done' &&
                  'bg-primary-accent border-primary-accent text-white',
                status === 'active' &&
                  'border-primary-accent text-primary-accent bg-primary-accent/5',
                status === 'pending' &&
                  'border-border text-muted-foreground bg-card'
              )}
            >
              {status === 'done' ? <Check className="h-3.5 w-3.5" /> : idx + 1}
            </div>
            <span
              className={cn(
                'text-sm hidden sm:block',
                status === 'pending' ? 'text-muted-foreground' : 'text-foreground'
              )}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <div className="h-px w-6 bg-border mx-1 hidden sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
