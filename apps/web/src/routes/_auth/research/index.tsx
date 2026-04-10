import { createFileRoute } from "@tanstack/react-router";

import { StockScreener } from "@/components/research/stock-screener";

export const Route = createFileRoute("/_auth/research/")({
  component: ResearchIndexPage,
  staticData: { title: "Research" },
});

function ResearchIndexPage() {
  return <StockScreener />;
}
