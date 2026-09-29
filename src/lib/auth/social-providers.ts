/**
 * Which social sign-in providers are configured on THIS server.
 *
 * Mirrors the conditions in src/auth.ts that decide whether the Google and
 * Microsoft providers are registered at all: both the id AND the secret must be
 * set. Keep the two in step — if a provider is not registered there, clicking
 * its button ends on an error page.
 *
 *   Google:    AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET
 *   Microsoft: AUTH_MICROSOFT_ID + AUTH_MICROSOFT_SECRET
 *              (AUTH_MICROSOFT_TENANT is optional, default "common")
 *
 * Read on the server (the login and signup layouts) and handed to the client
 * pages through a context, never through a NEXT_PUBLIC_ variable: nothing about
 * the deployment's configuration is exposed to the browser except the yes/no.
 */
export type SocialProviders = { google: boolean; microsoft: boolean };

export function configuredSocialProviders(): SocialProviders {
  return {
    google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    microsoft: !!(process.env.AUTH_MICROSOFT_ID && process.env.AUTH_MICROSOFT_SECRET),
  };
}
