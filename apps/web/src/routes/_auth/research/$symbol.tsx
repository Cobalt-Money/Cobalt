import { createFileRoute } from "@tanstack/react-router";

import { TickerDetailPage } from "@/components/research/ticker-detail-page";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/research/$symbol")({
  component: TickerDetailRoute,
});

function TickerDetailRoute() {
  const { symbol } = Route.useParams();
  return (
    <SidebarShellLayout sidebarInsetClassName="bg-background">
      <TickerDetailPage symbol={symbol} />
    </SidebarShellLayout>
  );
}
