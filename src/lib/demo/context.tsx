'use client';

import { createContext, useContext } from 'react';

/**
 * Carries "this page is the demo" from the dashboard layout (a server
 * component, which is the only place that can resolve it) down to the client
 * components that need to disable their controls.
 *
 * It is a CONVENIENCE, never a protection: every write is refused server-side by
 * requireWritableOrg regardless of what this says. Its only job is to stop the
 * UI from offering buttons that would fail — a disabled control explains itself,
 * an error after the click does not.
 */
const DemoContext = createContext(false);

export function DemoProvider({
  isDemo,
  children,
}: {
  isDemo: boolean;
  children: React.ReactNode;
}) {
  return <DemoContext.Provider value={isDemo}>{children}</DemoContext.Provider>;
}

/** True when the current dashboard is the read-only demo. */
export function useIsDemo(): boolean {
  return useContext(DemoContext);
}
