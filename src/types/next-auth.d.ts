import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
    currentOrgId?: string;
    currentOrgRole?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    currentOrgId?: string;
    currentOrgRole?: string;
  }
}
