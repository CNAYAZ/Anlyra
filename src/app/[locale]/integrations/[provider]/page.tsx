import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getCurrentContext } from "@/lib/session";
import { getIntegration } from "@/lib/integrations/registry";
import { planMeets } from "@/lib/plan/feature-gate";
import { ConnectionWizard } from "@/components/integrations/ConnectionWizard";
import { IntegrationManager } from "@/components/integrations/IntegrationManager";
import {
  SyncLogTable,
  type SyncLogRow,
} from "@/components/integrations/SyncLogTable";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface Props {
  params: { locale: string; provider: string };
}

export default async function ProviderPage({ params }: Props) {
  const definition = getIntegration(params.provider);
  if (!definition) notFound();

  const t = await getTranslations("integrations");
  const tCommon = await getTranslations("common");
  const { organizationId } = await getCurrentContext();
  const org = { id: organizationId, plan: 'PRO' as const };

  if (!planMeets(org.plan, definition.requiredPlan)) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-2 font-heading text-2xl font-bold">
          {definition.name}
        </h1>
        <p className="mb-6 text-slate-600">
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
      <h1 className="mb-1 font-heading text-3xl font-bold text-slate-900">
        {definition.name}
      </h1>
      <p className="mb-8 text-slate-600">
        {t(`providers.${definition.descriptionKey}` as never)}
      </p>

      {isConnected ? (
        <IntegrationManager
          providerId={definition.id}
          status={integration.status as "CONNECTED" | "ERROR"}
          frequency={integration.frequency as "H6" | "H12" | "H24"}
          lastSyncAt={integration.lastSyncAt?.toISOString() ?? null}
        />
      ) : (
        <ConnectionWizard
          providerId={definition.id}
          providerName={definition.name}
        />
      )}

      <section className="mt-10">
        <h2 className="mb-4 font-heading text-xl font-semibold text-slate-900">
          {t("logs.title")}
        </h2>
        <SyncLogTable logs={logs} />
      </section>
    </div>
  );
}
