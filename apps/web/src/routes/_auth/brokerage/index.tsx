import { BrokerageOverview } from "@cobalt-web/ui/cobalt/brokerage/brokerage-overview";
import { createFileRoute } from "@tanstack/react-router";
import type { ComponentProps } from "react";

import { useBrokerage } from "@/hooks/use-brokerage";

export const Route = createFileRoute("/_auth/brokerage/")({
  component: BrokerageIndexPage,
  staticData: { title: "Brokerage" },
});

function BrokerageIndexPage() {
  const data = useBrokerage();
  return (
    <BrokerageOverview
      {...(data as ComponentProps<typeof BrokerageOverview>)}
    />
  );
}
