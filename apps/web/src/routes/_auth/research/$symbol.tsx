import { createFileRoute } from "@tanstack/react-router";

import {
  chartQueryOptions,
  overviewQueryOptions,
  quoteQueryOptions,
} from "@/components/research/research-queries";
import { TickerDetailPage } from "@/components/research/ticker/ticker-detail-page";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/research/$symbol")({
  component: TickerDetailRoute,
  loader: ({ context, params }) => {
    const sym = params.symbol.trim().toUpperCase();
    context.queryClient.prefetchQuery(quoteQueryOptions(sym));
    context.queryClient.prefetchQuery(overviewQueryOptions(sym));
    context.queryClient.prefetchQuery(chartQueryOptions(sym, "1M"));
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
