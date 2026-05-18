import { cookies } from 'next/headers';

export type AppSession = {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
};

const DEMO_SESSION: AppSession = {
  userId: 'demo-user',
  email: 'demo@pro.app',
  name: 'Demo User',
  organizationId: 'demo-org',
  plan: 'PRO',
};

export function getSession(): AppSession | null {
  const override = cookies().get('pro_session')?.value;
  if (override) {
    try {
      return JSON.parse(override) as AppSession;
    } catch {
      // fall through
    }
  }
  return DEMO_SESSION;
}

export function requireSession(): AppSession {
  const s = getSession();
  if (!s) throw new Error('Unauthorized');
  return s;
}

export function getCurrentUser() {
  const s = getSession();
  if (!s) return null;
  return {
    id: s.userId,
    email: s.email,
    name: s.name,
    organizationId: s.organizationId,
    plan: s.plan,
  };
}

export async function requireUser() {
  const s = getSession();
  if (!s) throw new Error('Unauthorized');
  return {
    id: s.userId,
    email: s.email,
    name: s.name,
    orgId: s.organizationId,
    plan: s.plan,
  };
}
