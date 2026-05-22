import { createFileRoute } from "@tanstack/react-router";

import { BillingSection } from "@/components/settings/sections";

export const Route = createFileRoute("/_auth/settings/billing")({
  component: BillingSection,
});
