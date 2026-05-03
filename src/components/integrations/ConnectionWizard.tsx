"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";

interface Props {
  providerId: string;
  providerName: string;
}

export function ConnectionWizard({ providerId, providerName }: Props) {
  const t = useTranslations("integrations");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/${providerId}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardTitle className="mb-4">
        {t("wizard.title", { provider: providerName })}
      </CardTitle>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="apiKey"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            {t("wizard.apiKey")}
          </label>
          <input
            id="apiKey"
            type="password"
            required
            minLength={4}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-primary-accent focus:outline-none focus:ring-1 focus:ring-primary-accent"
            placeholder="sk_test_..."
          />
          <p className="mt-1 text-xs text-slate-500">
            {t("wizard.apiKeyHint", { provider: providerName })}
          </p>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? tCommon("loading") : t("wizard.submit")}
        </Button>
      </form>
    </Card>
  );
}
