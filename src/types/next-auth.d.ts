import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    // Optional because it really can be absent on the server: the Node session
    // callback in src/auth.ts removes it for an account with a pending deletion
    // request (and for one that no longer exists), so every consumer that asks
    // "who is signed in?" gets nobody. Every reader already uses `?.`.
    user?: {
      id: string;
    } & DefaultSession['user'];
    currentOrgId?: string;
    currentOrgRole?: string;
    // Set INSTEAD of `user` when the account has a pending deletion request.
    // Read by exactly two places, both on purpose: the cancellation screen
    // (app/[locale]/deletion-pending) and the route that cancels
    // (DELETE /api/gdpr/account, via getAuthContext({ allowDeletionPending })).
    deletionPendingUserId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    currentOrgId?: string;
    currentOrgRole?: string;
  }
}
