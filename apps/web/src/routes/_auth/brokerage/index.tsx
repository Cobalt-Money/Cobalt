import { queries } from "@cobalt-web/zero";
import { createFileRoute } from "@tanstack/react-router";

import { Overview } from "@/components/brokerage/overview";

export const Route = createFileRoute("/_auth/brokerage/")({
  component: Overview,
  loader: ({ context }) => {
    context.zero.run(queries.brokerage.accounts());
    context.zero.run(queries.brokerage.positions());
    context.zero.run(queries.brokerage.recentActivities());
    context.zero.run(queries.brokerage.portfolioSnapshots());
    context.zero.run(queries.brokerage.plaidInvestmentAccounts());
    context.zero.run(queries.brokerage.plaidPositions());
    context.zero.run(queries.brokerage.plaidActivities());
  },
  staticData: { title: "Brokerage" },
});
