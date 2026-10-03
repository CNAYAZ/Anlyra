import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/rate-limit';
import { PLANS, type PlanId } from '@/lib/billing/plans';

/**
 * THE TRIAL WITH A CARD — its numbers and the rule the customer accepts before
 * entering the card (founder's decisions, 2026-10-03).
 */

export { TRIAL_DAYS, TRIAL_CREDITS } from '@/lib/billing/trial-constants';
import { TRIAL_DAYS } from '@/lib/billing/trial-constants';

/** The price of a plan, in cents, for one period of the cycle. VAT is not added (regime forfetario). */
export function planAmountCents(plan: PlanId, cycle: 'monthly' | 'yearly'): number {
  const p = PLANS[plan].pricing;
  return cycle === 'yearly' ? p.yearlyCents : p.monthlyCents;
}

export function formatEuro(cents: number, locale: 'it' | 'en'): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-IE' : 'it-IT', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
}

/**
 * The exact sentence next to the checkbox. Built on the server from the
 * translation files, and the SAME call builds both the text the page shows
 * (/api/billing/trial-offer) and the text that is recorded when the box is
 * ticked (/api/billing/checkout) — so what is recorded is what was shown.
 */
export async function trialRuleText(params: {
  locale: 'it' | 'en';
  plan: PlanId;
  cycle: 'monthly' | 'yearly';
  trialOffered: boolean;
}): Promise<string> {
  const t = await getTranslations({ locale: params.locale, namespace: 'billing.trialRule' });
  const tPlans = await getTranslations({ locale: params.locale });
  const values = {
    days: TRIAL_DAYS,
    plan: tPlans(PLANS[params.plan].nameKey as 'billing.plans.pro.name'),
    amount: formatEuro(planAmountCents(params.plan, params.cycle), params.locale),
    period: t(params.cycle === 'yearly' ? 'perYear' : 'perMonth'),
  };
  return params.trialOffered ? t('withTrial', values) : t('withoutTrial', values);
}

/**
 * Records that the owner ticked the box: who, when (createdAt: date and time),
 * from which IP, the exact text shown and the amount. An audit row, kept like
 * the acceptance of the Terms ('auth.terms_accepted'): exempt from the audit
 * retention, IP cleared after 12 months (src/lib/billing/trial-claims.ts).
 *
 * Written directly, NOT through auditLog(), which swallows its own failures:
 * this is the proof the customer was told before paying, so a checkout whose
 * acceptance could not be recorded must not go ahead — the caller lets this throw.
 */
export async function recordTrialRuleAcceptance(params: {
  req: Request;
  userId: string;
  organizationId: string;
  text: string;
  amountCents: number;
  plan: PlanId;
  cycle: 'monthly' | 'yearly';
  locale: 'it' | 'en';
  trialOffered: boolean;
}): Promise<void> {
  const ip = getClientIp(params.req);
  await prisma.auditLog.create({
    data: {
      action: 'billing.trial_rule_accepted',
      userId: params.userId,
      organizationId: params.organizationId,
      targetType: 'organization',
      targetId: params.organizationId,
      outcome: 'success',
      ip: ip === 'unknown' ? null : ip,
      metadata: JSON.stringify({
        text: params.text,
        amountCents: params.amountCents,
        currency: 'EUR',
        plan: params.plan,
        cycle: params.cycle,
        locale: params.locale,
        trialOffered: params.trialOffered,
      }),
    },
  });
}
