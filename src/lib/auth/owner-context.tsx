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

/**
 * Same pattern as OwnerContext above, for 'owner' OR 'admin' (isManagerRole)
 * instead of 'owner' alone — the same three-way split requireManagerRole
 * enforces server-side for destructive/management actions (delete a
 * receivable, create a report's share link, and now: edit a scheduled
 * report's recipients/cadence). A convenience for the UI, never a
 * protection: every route this gates is refused server-side by
 * requireManagerRole regardless of what this context says.
 */
const ManagerContext = createContext(false);

export function ManagerProvider({
  isManager,
  children,
}: {
  isManager: boolean;
  children: React.ReactNode;
}) {
  return <ManagerContext.Provider value={isManager}>{children}</ManagerContext.Provider>;
}

/** True when the current member is the organization's 'owner' or 'admin'. */
export function useIsManager(): boolean {
  return useContext(ManagerContext);
}

/**
 * Same pattern again, for the widest split: a member whose role may only READ
 * ('viewer', or any role requireEditorRole does not recognise). Lets every
 * page disable its create/edit/AI controls instead of offering a button that
 * would come back 403 VIEWER_READ_ONLY. A convenience for the UI, never a
 * protection: each of those routes is refused server-side by
 * requireEditorRole regardless of what this context says.
 *
 * Defaults to false (not read-only), like the demo: the demo organization
 * has its own read-only handling (DemoProvider), and an anonymous demo
 * visitor has no role at all.
 */
const ReadOnlyRoleContext = createContext(false);

export function ReadOnlyRoleProvider({
  isReadOnly,
  children,
}: {
  isReadOnly: boolean;
  children: React.ReactNode;
}) {
  return <ReadOnlyRoleContext.Provider value={isReadOnly}>{children}</ReadOnlyRoleContext.Provider>;
}

/** True when the current member may only read (role 'viewer'). */
export function useIsReadOnlyRole(): boolean {
  return useContext(ReadOnlyRoleContext);
}
