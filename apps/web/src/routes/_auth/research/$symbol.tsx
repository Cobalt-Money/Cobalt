import { createFileRoute } from "@tanstack/react-router";

import { TickerDetailPage } from "@/components/research/ticker/ticker-detail-page";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";
import {
  chartQuery,
  quoteQuery,
  tickerOverview,
} from "@/hooks/research-queries";

export const Route = createFileRoute("/_auth/research/$symbol")({
  component: TickerDetailRoute,
  loader: ({ context, params }) => {
    const sym = params.symbol.trim().toUpperCase();
    context.queryClient.prefetchQuery(quoteQuery(sym));
    context.queryClient.prefetchQuery(tickerOverview(sym));
    context.queryClient.prefetchQuery(chartQuery(sym, "1M"));
  },
});

function TickerDetailRoute() {
  const { symbol } = Route.useParams();
  return (
    <SidebarShellLayout sidebarInsetClassName="bg-background">
      <TickerDetailPage symbol={symbol} />
    </SidebarShellLayout>
  );
}
