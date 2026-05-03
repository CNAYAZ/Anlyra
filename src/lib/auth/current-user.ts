import type { Plan } from '@/lib/plans';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  plan: Plan;
}

export function getCurrentUser(): CurrentUser {
  return {
    id: 'usr_demo',
    email: 'demo@pro.app',
    name: 'Demo User',
    plan: (process.env.NEXT_PUBLIC_DEMO_PLAN as Plan) ?? 'pro',
  };
}
