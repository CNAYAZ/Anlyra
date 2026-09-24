import { redirectIfDeletionPending } from '@/lib/session';

// page.tsx next to this file is a Client Component and lives OUTSIDE the
// (dashboard) route group, so neither can send an account with a pending
// deletion request to the cancellation screen: this layout does, the same way
// onboarding/organization/layout.tsx guards its client form. The report data
// itself is already refused at the source (its API routes see no user).
export default async function ReportDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await params;
  await redirectIfDeletionPending(locale);
  return <>{children}</>;
}
