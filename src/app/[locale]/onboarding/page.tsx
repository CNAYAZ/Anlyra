import { setRequestLocale } from 'next-intl/server';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';

export default async function OnboardingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OnboardingFlow />;
}
