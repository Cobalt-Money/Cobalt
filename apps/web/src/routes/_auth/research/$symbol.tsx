import { createFileRoute } from "@tanstack/react-router";

import { TickerDetailPage } from "@/components/research/ticker-detail-page";

export const Route = createFileRoute("/_auth/research/$symbol")({
  component: TickerDetailRoute,
});

function TickerDetailRoute() {
  const { symbol } = Route.useParams();
  return <TickerDetailPage symbol={symbol} />;
}
