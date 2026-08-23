'use client';

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A form-level error: something that went wrong with the submission as a whole
 * and cannot be pinned to one field (a failed save, a server refusal, a
 * network error).
 *
 * WHERE TO PUT IT: immediately NEXT TO THE SUBMIT BUTTON, not at the top of the
 * page. The user's eyes are on the button they just clicked; an error banner
 * above a long form is off-screen exactly when it matters, so the click looks
 * like it did nothing. Inside a modal it is worse — a page-level banner renders
 * BEHIND the dialog and is never seen at all.
 *
 * For an error about ONE field, do NOT use this: use `Field`'s `error` prop
 * (src/components/ui/field.tsx), which renders under that field and wires up
 * aria-describedby/aria-invalid for you.
 *
 * ACCESSIBILITY: `role="alert"` makes screen readers announce the message the
 * moment it appears, without moving focus. The AlertCircle icon means the state
 * is not conveyed by colour alone (WCAG 1.4.1). Rendering is conditional on
 * `children`, so the alert is inserted into the DOM when the error occurs —
 * which is what makes assistive tech announce it.
 *
 * STYLE: the same banner already used across the app
 * (`border-danger/40 bg-danger/10 text-danger`) — deliberately not a new look,
 * so nothing needs re-learning.
 */
export function FormError({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
