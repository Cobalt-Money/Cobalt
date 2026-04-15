import { BrokerageOverview } from "@cobalt-web/ui/cobalt/brokerage/brokerage-overview";
import { queries } from "@cobalt-web/zero";
import type { Zero } from "@rocicorp/zero";
import { createFileRoute } from "@tanstack/react-router";
import type { ComponentProps } from "react";

import { useBrokerage } from "@/hooks/use-brokerage";

export const Route = createFileRoute("/_auth/brokerage/")({
  component: BrokerageIndexPage,
  loader: ({ context }) => {
    const z = context.zero as unknown as Zero;
    z.run(queries.brokerage.accounts());
    z.run(queries.brokerage.positions());
    z.run(queries.brokerage.recentActivities());
    z.run(queries.brokerage.portfolioSnapshots());
    z.run(queries.brokerage.plaidInvestmentAccounts());
    z.run(queries.brokerage.plaidPositions());
    z.run(queries.brokerage.plaidActivities());
  },
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
