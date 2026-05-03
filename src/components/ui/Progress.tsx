import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  variant = "primary",
}: {
  value: number;
  className?: string;
  variant?: "primary" | "warning" | "danger";
}) {
  const safe = Math.max(0, Math.min(100, value));
  const fill =
    variant === "danger"
      ? "bg-danger"
      : variant === "warning"
        ? "bg-warning"
        : "bg-primary-accent";
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className={cn("h-full rounded-full transition-all", fill)}
        style={{ width: `${safe}%` }}
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
