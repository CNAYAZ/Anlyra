import { SocialProvidersProvider } from '@/lib/auth/social-providers-context';
import { configuredSocialProviders } from '@/lib/auth/social-providers';

// Read at request time, not at build time: which providers exist is a fact
// about the running server's environment (see social-providers.ts).
export const dynamic = 'force-dynamic';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SocialProvidersProvider providers={configuredSocialProviders()}>{children}</SocialProvidersProvider>;
}
