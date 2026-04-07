import { createFileRoute } from "@tanstack/react-router";

import { useBrokerage } from "@/hooks/use-brokerage";

export const Route = createFileRoute("/_auth/brokerage/")({
  component: BrokerageIndexPage,
  staticData: { title: "Brokerage" },
});

function BrokerageIndexPage() {
  useBrokerage();
  return null;
}
