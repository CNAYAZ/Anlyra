import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { PricingClient } from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing — Pro",
  description: "Pick the plan that fits your business.",
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  return <PricingClient isAuthenticated={Boolean(user)} />;
}
