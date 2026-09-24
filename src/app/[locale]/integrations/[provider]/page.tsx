import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentContext,
  redirectIfDeletionPending,
  isDemoOrganization,
  getAuthContext,
} from "@/lib/session";
import { isManagerRole } from "@/lib/auth/require-role";
import { getBillingState } from "@/lib/billing/repository";
import { getIntegration } from "@/lib/integrations/registry";
import { planMeets } from "@/lib/plan/feature-gate";
import { IntegrationManager } from "@/components/integrations/IntegrationManager";
import {
  SyncLogTable,
  type SyncLogRow,
} from "@/components/integrations/SyncLogTable";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; provider: string }>;
}

export default async function ProviderPage(props: Props) {
  const params = await props.params;
  const definition = getIntegration(params.provider);
  if (!definition) notFound();

  const t = await getTranslations("integrations");
  const tCommon = await getTranslations("common");
  // Outside the (dashboard) layout, so its deletion redirect does not cover
  // this page: without this line getCurrentContext below would throw instead.
  await redirectIfDeletionPending(params.locale);
  const { organizationId } = await getCurrentContext();
  const org = { id: organizationId };

  // Outside the (dashboard) layout, so ManagerProvider never reaches this
  // page: sync/disconnect/frequency below are requireManagerRole
  // server-side (src/app/api/integrations/[provider]/*), same resolution as
  // the dashboard layout (null for the demo org, which has no real
  // Membership role to read).
  const isDemo = isDemoOrganization(organizationId);
  const authCtx = isDemo ? null : await getAuthContext();
  const isManager = authCtx ? isManagerRole(authCtx.role) : false;

  // The plan the organization is ACTUALLY on, read on the server from
  // BillingSubscription — the same getBillingState() the dashboard layout uses.
  //
  // ── WHY NOT usePlan()/BillingProvider ──
  // This page lives OUTSIDE the (dashboard) route group (it is
  // app/[locale]/integrations/[provider], while the list page is
  // app/[locale]/(dashboard)/integrations), so the dashboard layout — and with
  // it BillingProvider — never wraps it. It does not need them: this is a
  // server component, so it can read the real plan directly instead of waiting
  // for a client context.
  //
  // This used to be `{ plan: 'PRO' as const }`, a plan written by hand. The
  // consequence was not theoretical: planMeets('PRO', 'ENTERPRISE') is false,
  // so an ENTERPRISE customer opening one of the three ENTERPRISE integrations
  // was shown "locked, upgrade your plan" for something they had already paid
  // for.
  const { plan } = await getBillingState(organizationId);

  if (!planMeets(plan, definition.requiredPlan)) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-2 font-heading text-2xl font-bold">
          {definition.name}
        </h1>
        <p className="mb-6 text-muted-foreground">
          {t("lockedOn", { plan: definition.requiredPlan })}
        </p>
        <Link href="/billing">
          <Button>{t("upgrade")}</Button>
        </Link>
      </div>
    );
  }

  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: org.id,
        provider: definition.id,
      },
    },
    include: {
      syncLogs: { orderBy: { startedAt: "desc" }, take: 20 },
    },
  });

  const isConnected =
    integration && integration.status !== "DISCONNECTED";

  const logs: SyncLogRow[] =
    integration?.syncLogs.map((l) => ({
      id: l.id,
      status: l.status as SyncLogRow["status"],
      recordsCount: l.recordsCount,
      errorMessage: l.errorMessage,
      startedAt: l.startedAt.toISOString(),
      finishedAt: l.finishedAt?.toISOString() ?? null,
    })) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/integrations"
        className="mb-4 inline-block text-sm text-primary-accent hover:underline"
      >
        ← {tCommon("back")}
      </Link>
      <h1 className="mb-1 font-heading text-3xl font-bold text-foreground">
        {definition.name}
      </h1>
      <p className="mb-8 text-muted-foreground">
        {t(`providers.${definition.descriptionKey}` as never)}
      </p>

      {isConnected ? (
        <IntegrationManager
          providerId={definition.id}
          status={integration.status as "CONNECTED" | "ERROR"}
          frequency={integration.frequency as "H6" | "H12" | "H24"}
          lastSyncAt={integration.lastSyncAt?.toISOString() ?? null}
          isManager={isManager}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-2 font-heading text-lg font-semibold text-foreground">
            {t("comingSoon")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("comingSoonHint")}
          </p>
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-4 font-heading text-xl font-semibold text-foreground">
          {t("logs.title")}
        </h2>
        <SyncLogTable logs={logs} />
      </section>
    </div>
  );
}
