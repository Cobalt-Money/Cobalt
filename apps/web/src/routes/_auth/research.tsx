import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/research")({
  component: ResearchPage,
  staticData: { title: "Research" },
});

function ResearchPage() {
  return <SidebarShellLayout />;
}
