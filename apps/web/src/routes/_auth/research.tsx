import { createFileRoute } from "@tanstack/react-router";

import { StockScreener } from "@/components/research/stock-screener";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/research")({
  component: ResearchPage,
  staticData: { title: "Research" },
});

function ResearchPage() {
  return (
    <SidebarShellLayout>
      <StockScreener />
    </SidebarShellLayout>
  );
}
