// Plan limits parameterized via env vars (placeholder until pricing is finalized).
// Values are read at module load; defaults are conservative.

export const PLAN_LIMITS = {
  PRO: {
    usersPerOrg: parseInt(process.env.PLAN_PRO_USERS_PER_ORG || '3', 10),
    orgsPerUser: parseInt(process.env.PLAN_PRO_ORGS_PER_USER || '1', 10),
  },
  ADVANCED: {
    usersPerOrg: parseInt(process.env.PLAN_ADVANCED_USERS_PER_ORG || '10', 10),
    orgsPerUser: parseInt(process.env.PLAN_ADVANCED_ORGS_PER_USER || '3', 10),
  },
  ENTERPRISE: {
    usersPerOrg: parseInt(process.env.PLAN_ENTERPRISE_USERS_PER_ORG || '999', 10),
    orgsPerUser: parseInt(process.env.PLAN_ENTERPRISE_ORGS_PER_USER || '999', 10),
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export function planLimits(plan: string) {
  const key = (plan?.toUpperCase() as PlanKey) || 'PRO';
  return PLAN_LIMITS[key] ?? PLAN_LIMITS.PRO;
}

export const PASSWORD_POLICY = {
  minLength: 12,
  // at least 1 uppercase, 1 number, 1 special char
  regex: /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/,
  describe: 'Almeno 12 caratteri, 1 maiuscola, 1 numero e 1 carattere speciale.',
} as const;

export function validatePassword(password: string): boolean {
  return typeof password === 'string' && PASSWORD_POLICY.regex.test(password);
}
