import { prisma } from '@/lib/prisma';
import { siteUrl } from '@/lib/auth/tokens';
import {
  sendEmail,
  trialThreeDaysTemplate,
  trialOneDayTemplate,
  trialExpiredTemplate,
} from '@/lib/email';

const DAY_MS = 24 * 60 * 60 * 1000;

const PLAN_LABEL: Record<string, { name: string; amount: string }> = {
  PRO: { name: 'PRO', amount: '€49' },
  ADVANCED: { name: 'Avanzato', amount: '€149' },
  ENTERPRISE: { name: 'Enterprise', amount: '—' },
};

function fmtDate(d: Date, locale = 'it-IT'): string {
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

async function orgAdminEmails(organizationId: string): Promise<{ email: string; name: string }[]> {
  const memberships = await prisma.membership.findMany({
    where: { organizationId, role: { in: ['admin', 'owner'] } },
    include: { user: { select: { email: true, name: true } } },
  });
  return memberships
    .filter((m) => m.user?.email)
    .map((m) => ({ email: m.user!.email, name: m.user!.name || m.user!.email }));
}

export interface TrialCheckResult {
  threeDays: number;
  oneDay: number;
  expired: number;
}

export async function runTrialCheck(now = new Date()): Promise<TrialCheckResult> {
  const result: TrialCheckResult = { threeDays: 0, oneDay: 0, expired: 0 };

  const orgs = await prisma.organization.findMany({
    where: { trialEndsAt: { not: null } },
    select: { id: true, name: true, plan: true, trialEndsAt: true },
  });

  const upgradeUrl = `${siteUrl()}/it/settings/billing`;
  const reactivateUrl = upgradeUrl;
  const cancelUrl = upgradeUrl;
  const exportUrl = `${siteUrl()}/it/settings/billing`;

  for (const org of orgs) {
    if (!org.trialEndsAt) continue;
    const msLeft = org.trialEndsAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / DAY_MS);
    const plan = PLAN_LABEL[org.plan] || PLAN_LABEL.PRO;
    const recipients = await orgAdminEmails(org.id);
    if (recipients.length === 0) continue;

    for (const r of recipients) {
      if (msLeft <= 0 && msLeft > -DAY_MS) {
        // Expired within the last day → send once.
        await sendEmail({
          to: r.email,
          subject: 'Prova scaduta — riattiva il tuo account · Anlyra',
          html: trialExpiredTemplate({
            userName: r.name,
            userEmail: r.email,
            expiredAt: fmtDate(org.trialEndsAt),
            reactivateUrl,
            exportUrl,
          }),
        }).catch(() => {});
        result.expired++;
      } else if (daysLeft === 1) {
        await sendEmail({
          to: r.email,
          subject: 'Domani inizia il tuo piano · Anlyra',
          html: trialOneDayTemplate({
            userName: r.name,
            userEmail: r.email,
            billingDate: fmtDate(org.trialEndsAt),
            billingAmount: plan.amount,
            planName: plan.name,
            upgradeUrl,
            cancelUrl,
          }),
        }).catch(() => {});
        result.oneDay++;
      } else if (daysLeft > 1 && daysLeft <= 3) {
        await sendEmail({
          to: r.email,
          subject: `${daysLeft} giorni alla fine della prova · Anlyra`,
          html: trialThreeDaysTemplate({
            userName: r.name,
            userEmail: r.email,
            daysRemaining: daysLeft,
            planName: plan.name,
            upgradeUrl,
            billingDate: fmtDate(org.trialEndsAt),
          }),
        }).catch(() => {});
        result.threeDays++;
      }
    }
  }

  return result;
}
