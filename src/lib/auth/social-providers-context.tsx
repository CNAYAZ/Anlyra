'use client';

import { createContext, useContext } from 'react';
import type { SocialProviders } from '@/lib/auth/social-providers';

/**
 * Carries "which social sign-in providers this server has configured" from the
 * login and signup layouts (server components, the only place that can read the
 * environment) to the client pages that draw the buttons. Same pattern as
 * OwnerContext (owner-context.tsx): a convenience for the interface, never a
 * protection — a provider that is not registered in src/auth.ts cannot sign
 * anyone in whatever this says.
 *
 * Defaults to "none": a page rendered without the provider shows no social
 * button rather than one that would fail.
 */
const SocialProvidersContext = createContext<SocialProviders>({ google: false, microsoft: false });

export function SocialProvidersProvider({
  providers,
  children,
}: {
  providers: SocialProviders;
  children: React.ReactNode;
}) {
  return <SocialProvidersContext.Provider value={providers}>{children}</SocialProvidersContext.Provider>;
}

export function useSocialProviders(): SocialProviders {
  return useContext(SocialProvidersContext);
}
