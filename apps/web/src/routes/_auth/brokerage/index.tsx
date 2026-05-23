import { queries } from "@cobalt-web/zero";
import { createFileRoute } from "@tanstack/react-router";

import { Overview } from "@/components/brokerage/overview";

export const Route = createFileRoute("/_auth/brokerage/")({
  component: Overview,
  loader: ({ context }) => {
    context.zero.preload(queries.brokerage.accounts(), { ttl: "5m" });
    context.zero.preload(queries.brokerage.positions(), { ttl: "5m" });
    context.zero.preload(queries.brokerage.recentActivities(), { ttl: "5m" });
    context.zero.preload(queries.brokerage.portfolioSnapshots(), { ttl: "5m" });
    context.zero.preload(queries.brokerage.plaidInvestmentAccounts(), { ttl: "5m" });
  },
  staticData: { title: "Brokerage" },
});
