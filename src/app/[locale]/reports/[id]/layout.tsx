import {
  redirectIfDeletionPending,
  getCurrentContext,
  isDemoOrganization,
  getAuthContext,
} from '@/lib/session';
import { isManagerRole } from '@/lib/auth/require-role';
import { ManagerProvider } from '@/lib/auth/owner-context';

// page.tsx next to this file is a Client Component and lives OUTSIDE the
// (dashboard) route group, so neither can send an account with a pending
// deletion request to the cancellation screen: this layout does, the same way
// onboarding/organization/layout.tsx guards its client form. The report data
// itself is already refused at the source (its API routes see no user).
//
// It also feeds ManagerProvider, the same context the (dashboard) layout
// populates: page.tsx offers "create share link" (requireManagerRole on
// POST reports/[id]/share) to whoever opens the page, since without this it
// has no role at all to check.
export default async function ReportDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await params;
  await redirectIfDeletionPending(locale);

  const { organizationId } = await getCurrentContext();
  const isDemo = isDemoOrganization(organizationId);
  const authCtx = isDemo ? null : await getAuthContext();
  const isManager = authCtx ? isManagerRole(authCtx.role) : false;

  return <ManagerProvider isManager={isManager}>{children}</ManagerProvider>;
}
