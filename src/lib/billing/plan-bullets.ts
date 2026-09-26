import { PLANS, isUnlimited, type PlanId } from './plans';

type Translate = (key: string, values?: Record<string, number>) => string;

/**
 * The plan bullets that are numbers — people, AI credits, companies — read
 * from the price list (PLANS[...].limits), the same values the server
 * enforces, so the pricing page and the billing page can never promise a
 * different number. `t` is a translator for the `pricing` namespace.
 */
export function planLimitBullets(planId: PlanId, t: Translate): string[] {
  const { users, freeViewers, aiCredits, orgs } = PLANS[planId].limits;
  return [
    isUnlimited(users)
      ? t('seatsUnlimited')
      : freeViewers > 0
        ? t('seatsWithViewers', { count: users, viewers: freeViewers })
        : t('seats', { count: users }),
    isUnlimited(aiCredits) ? t('creditsUnlimited') : t('creditsPerMonth', { count: aiCredits }),
    isUnlimited(orgs) ? t('orgsUnlimited') : t('orgs', { count: orgs }),
  ];
}
