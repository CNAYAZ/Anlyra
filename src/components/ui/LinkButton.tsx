import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const linkButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent",
  {
    variants: {
      variant: {
        primary: "bg-primary-accent text-white hover:bg-primary-hover",
        secondary: "bg-muted text-foreground hover:bg-muted/80",
        outline: "border border-border bg-card text-foreground hover:bg-muted/50",
        ghost: "text-foreground hover:bg-muted",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface LinkButtonProps
  extends LinkProps,
    VariantProps<typeof linkButtonVariants> {
  className?: string;
  children: ReactNode;
}

export function LinkButton({ className, variant, size, children, ...props }: LinkButtonProps) {
  return (
    <Link className={cn(linkButtonVariants({ variant, size }), className)} {...props}>
      {children}
    </Link>
  );
}
