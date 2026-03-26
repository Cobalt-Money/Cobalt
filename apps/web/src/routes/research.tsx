import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";

export const Route = createFileRoute("/research")({
  component: ResearchPage,
  staticData: { title: "Research" },
});

function ResearchPage() {
  return <SidebarShellLayout />;
}
