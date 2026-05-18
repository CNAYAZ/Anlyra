"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/fetcher";
import type { Competitor } from "@/types/market";

const formSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().or(z.literal("")).optional(),
  revenue: z.coerce.number().min(0),
  employees: z.coerce.number().int().min(0),
  marketSharePct: z.coerce.number().min(0).max(100),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  pricePosition: z.coerce.number().min(0).max(100),
  qualityScore: z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof formSchema>;

export function CompetitorFormDialog({
  mode,
  competitor,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  competitor?: Competitor;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("market.competitors");
  const tCommon = useTranslations("common");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: competitor?.name ?? "",
      website: competitor?.website ?? "",
      revenue: competitor?.revenue ?? 0,
      employees: competitor?.employees ?? 0,
      marketSharePct: competitor?.marketSharePct ?? 0,
      strengths: competitor?.strengths.join(", ") ?? "",
      weaknesses: competitor?.weaknesses.join(", ") ?? "",
      pricePosition: competitor?.pricePosition ?? 50,
      qualityScore: competitor?.qualityScore ?? 50,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        website: values.website ? values.website : null,
        revenue: values.revenue,
        employees: values.employees,
        marketSharePct: values.marketSharePct,
        strengths: (values.strengths ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        weaknesses: (values.weaknesses ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        pricePosition: values.pricePosition,
        qualityScore: values.qualityScore,
      };
      const url =
        mode === "edit" && competitor
          ? `/api/analysis/market/competitors/${competitor.id}`
          : "/api/analysis/market/competitors";
      const method = mode === "edit" ? "PATCH" : "POST";
      return apiFetch<Competitor>(url, {
        method,
        body: JSON.stringify(payload),
      });
    },
    onSuccess,
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("add") : tCommon("edit")}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="grid grid-cols-2 gap-4"
        >
          <div className="col-span-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
            )}
          </div>
          <div className="col-span-2">
            <Label htmlFor="website">{t("website")}</Label>
            <Input id="website" placeholder="https://" {...register("website")} />
          </div>
          <div>
            <Label htmlFor="revenue">{t("revenue")}</Label>
            <Input id="revenue" type="number" step="0.01" {...register("revenue")} />
          </div>
          <div>
            <Label htmlFor="employees">{t("employees")}</Label>
            <Input id="employees" type="number" {...register("employees")} />
          </div>
          <div>
            <Label htmlFor="marketSharePct">{t("marketShare")} (%)</Label>
            <Input
              id="marketSharePct"
              type="number"
              step="0.1"
              {...register("marketSharePct")}
            />
          </div>
          <div>
            <Label htmlFor="qualityScore">Quality (0–100)</Label>
            <Input
              id="qualityScore"
              type="number"
              step="1"
              {...register("qualityScore")}
            />
          </div>
          <div>
            <Label htmlFor="pricePosition">Price (0–100)</Label>
            <Input
              id="pricePosition"
              type="number"
              step="1"
              {...register("pricePosition")}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="strengths">{t("strengths")}</Label>
            <Input id="strengths" placeholder="A, B, C" {...register("strengths")} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="weaknesses">{t("weaknesses")}</Label>
            <Input id="weaknesses" placeholder="A, B, C" {...register("weaknesses")} />
          </div>

          {mutation.isError ? (
            <p className="col-span-2 text-xs text-danger">
              {(mutation.error as Error).message}
            </p>
          ) : null}

          <DialogFooter className="col-span-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
