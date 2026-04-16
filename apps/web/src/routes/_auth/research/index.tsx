import { createFileRoute } from "@tanstack/react-router";

import { StockScreener } from "@/components/research/stock-screener";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/research/")({
  component: ResearchIndexPage,
  staticData: { title: "Research" },
});

function ResearchIndexPage() {
  return (
    <SidebarShellLayout>
      <StockScreener />
    </SidebarShellLayout>
  );
}
