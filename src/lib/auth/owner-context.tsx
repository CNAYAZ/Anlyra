'use client';

import { createContext, useContext } from 'react';

/**
 * Carries "this member is the organization's owner" from the dashboard
 * layout (a server component, the only place that can resolve the real
 * Membership.role) down to the client components that need to hide or
 * disable billing controls.
 *
 * Same pattern as DemoContext (src/lib/demo/context.tsx): a CONVENIENCE,
 * never a protection. Every billing route is refused server-side by
 * requireOwnerRole regardless of what this says. Its only job is to stop
 * the UI from offering a button that would fail — a hidden/disabled control
 * explains itself, a 403 after the click does not.
 */
const OwnerContext = createContext(false);

export function OwnerProvider({
  isOwner,
  children,
}: {
  isOwner: boolean;
  children: React.ReactNode;
}) {
  return <OwnerContext.Provider value={isOwner}>{children}</OwnerContext.Provider>;
}

/** True when the current member is the organization's 'owner'. */
export function useIsOwner(): boolean {
  return useContext(OwnerContext);
}
