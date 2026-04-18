import { createFileRoute } from "@tanstack/react-router";

import { screenerQueryOptions } from "@/components/research/research-queries";
import { StockScreener } from "@/components/research/stock-screener";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";
import { screenerUniverseQuery } from "@/hooks/research-queries";

export const Route = createFileRoute("/_auth/research/")({
  component: ResearchIndexPage,
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(screenerUniverseQuery);
  },
  staticData: { title: "Research" },
});

function ResearchIndexPage() {
  return (
    <SidebarShellLayout>
      <StockScreener />
    </SidebarShellLayout>
  );
}
